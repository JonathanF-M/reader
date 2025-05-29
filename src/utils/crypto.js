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