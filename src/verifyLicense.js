import { importSPKI, jwtVerify } from 'jose'
import { publicKeyPem } from './publicKey'

export async function verifyLicense(token) {
    try {
        const key = await importSPKI(publicKeyPem, 'RS256');
        const { payload } = await jwtVerify(token, key);
        return { valid: true, payload };
    } catch (err) {
        return { valid:false, error: err.message }
    }
}