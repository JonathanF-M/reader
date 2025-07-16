export async function generateReaderKeys() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  return keyPair
}

export async function exportPublicKey(publicKey) {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  const exportedAsString = String.fromCharCode.apply(null, new Uint8Array(exported));
  const exportedAsBase64 = btoa(exportedAsString);
  return `-----BEGIN PUBLIC KEY-----\n${exportedAsBase64}\n-----END PUBLIC KEY-----`;
}

//convert to jwk for local storage
export async function exportPrivateKey(privateKey) {
  return await crypto.subtle.exportKey("jwk", privateKey);
}

//convert back to privatekey from jwk
export async function importPrivateKey(jwk) {
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-PSS",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
}

export async function importAESKey(hexKey) {
  const keyBuffer = Uint8Array.from(hexKey.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  return crypto.subtle.importKey(
    "raw",
    keyBuffer,
    "AES-CBC",
    false,
    ["decrypt"]
  );
}

export async function decryptFile(encryptedBuffer, key, iv) {
  return crypto.subtle.decrypt(
    {name: "AES-CBC", iv},
    key,
    encryptedBuffer
  );
}