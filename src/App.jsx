import './App.css';
import React, { useEffect, useState } from 'react';
import { importAESKey, decryptFile, exportPublicKey, exportPrivateKey, importPrivateKey, signMessage } from './utils/crypto';
import { generateReaderKeys} from './utils/crypto';
import { renderEPUB } from './utils/epub';
import { serverPublicKeyPem } from './publicKey';
import * as jose from "jose";

function App() {
  const [status, setStatus] = useState("Idle")
  const [readerKeys, setReaderKeys] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [rendition, setRendition] = useState(null)
  const [bookId, setBookId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const savedKeys = localStorage.getItem('readerKeys');
      const registered = localStorage.getItem('readerRegistered');
  
      if (savedKeys && registered) {
        const keyData = JSON.parse(savedKeys);
        const privateKey = await importPrivateKey(keyData.privateKey);
        setReaderKeys({ privateKey, readerId: keyData.readerId })
        setIsRegistered(true);
      }
    }
    fetchData();
  }, []);

  async function registerReader() {
    try {
      setStatus("Generating Keys...");
      const keyPair = await generateReaderKeys();
      const readerPublicKeyPem = await exportPublicKey(keyPair.publicKey)
      setStatus("Succesfully Generated Keys")

      setStatus("Registering with server...");
      const response = await fetch(`http://localhost:3000/api/v1/readers`,{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_key: readerPublicKeyPem })
      })

      const data = await response.json();

      const privateKeyJwk = await exportPrivateKey(keyPair.privateKey);
      localStorage.setItem('readerKeys', JSON.stringify({
        privateKey: privateKeyJwk,
        readerId: data.reader_id
      }));
      setReaderKeys(keyPair); //there's some problem with how the reader ID is set here
      //it's fixed by a refresh, TODO

      localStorage.setItem('readerRegistered', true);
      setIsRegistered(true);
      
      setStatus("Registered")

    } catch(err) {
      setStatus("Registration Failed");
    }
  }

  async function loadBook() {
    if (!bookId || !readerKeys) return;
    try {
      setStatus("Signing request...");

      const timestamp = Date.now()

      const requestData = JSON.stringify({
        user: 'test_user',
        asset_id: bookId,
        reader_id: readerKeys.readerId,
        timestamp
      });

      const signature = await signMessage(readerKeys.privateKey, requestData);

      setStatus("Fetching License...");
      const response = await fetch(`http://localhost:3000/api/v1/licenses`,  {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user: 'test_user',
          asset_id: bookId,
          reader_id: readerKeys.readerId,
          signature: signature,
          timestamp
        })
      })

      const data = await response.json();
      
      const publicKey = await jose.importSPKI(serverPublicKeyPem, "RS256");
      const { payload } = await jose.jwtVerify(data.license, publicKey);
      
      const hexKey = payload.key;
      const key = await importAESKey(hexKey);

      setStatus("Decrypting book...");
      const encryptedEpubBuffer = Uint8Array.from(atob(data.encrypted_epub), c => c.charCodeAt(0));
      
      const iv = encryptedEpubBuffer.slice(0, 16);
      const encryptedContent = encryptedEpubBuffer.slice(16);
      
      const decrypted = await decryptFile(encryptedContent, key, iv);
      const epubBlob = new Blob([decrypted], {type: "application/epub+zip"});
      const bookRendition = await renderEPUB(epubBlob, "viewer");
      setRendition(bookRendition);
      setStatus("Success!");
    } catch (err) {
      alert("Failed to load book");
      setStatus("Error");
    }
  }

  return (
    <div>
      <h1>Secure EPUB Reader</h1>
      <p>Status: {status}</p>

      {!isRegistered ? (
        <button onClick={registerReader}>Register Reader</button>
      ) : (
        <>
          <input
            value={bookId}
            onChange={(e) => setBookId(e.target.value)}
            placeholder='Book ID'
          />
          <button onClick={loadBook}>Load Book</button>
          {rendition && (
            <div>
              <button onClick={() => rendition.prev()}>Previous</button>
              <button onClick={() => rendition.next()}>Next</button>

            </div>
          )}
          <div id="viewer" style={{ height: "600px" }}></div>
        </>
      )}
    </div>
  );
}

export default App;
