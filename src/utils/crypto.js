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