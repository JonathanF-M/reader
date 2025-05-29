import './App.css';
import React, { useEffect, useState } from 'react';
import { importAESKey, decryptFile, exportPublicKey } from './utils/crypto';
import { generateReaderKeys} from './utils/crypto';
import { renderEPUB } from './utils/epub';
import { publicKeyPem } from './publicKey';
import * as jose from "jose";

function App() {
  const [status, setStatus] = useState("Idle")
  const [readerKeys, setReaderKeys] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [rendition, setRendition] = useState(null)
  const [bookId, setBookId] = useState('');

  useEffect(() => {
    const savedKeys = localStorage.getItem('readerKeys');
    const registered = localStorage.getItem('readerRegistered');

    if (savedKeys && registered) {
      setIsRegistered(true);
    }
  }, []);

  async function registerReader() {
    try {
      setStatus("Generating Keys...");
      const keyPair = await generateReaderKeys();
      const publicKeyPem = await exportPublicKey(keyPair.publicKey)
      setStatus("Succesfully Generated Keys")

      setStatus("Registering with server...");
      const response = await fetch(`http://localhost:3000/api/v1/readers`,{
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_key: publicKeyPem })
      })

      const data = await response.json();

    } catch(err) {
      setStatus("Registration Failed");
    }
  }

  async function loadBook() {
    if (!bookId) return;
    try {
      setStatus("Fetching License...");
      const response = await fetch(`http://localhost:3000/api/v1/licenses`,  {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          user: 'test_user',
          asset_id: bookId
        })
      })

      const data = await response.json();
      
      const publicKey = await jose.importSPKI(publicKeyPem, "RS256");
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
