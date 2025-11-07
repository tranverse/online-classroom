package com.backend.util;

import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public class CryptoUtil {
    private static final String ALGO = "AES/GCM/NoPadding";
    private static final int TAG_LEN = 128;

    public static String encrypt(String base64Key, byte[] plaintext) throws Exception {
        byte[] key = Base64.getDecoder().decode(base64Key);
        byte[] iv = java.util.Arrays.copyOfRange(java.security.SecureRandom.getInstanceStrong().generateSeed(12), 0, 12);
        SecretKeySpec spec = new SecretKeySpec(key, "AES");
        Cipher cipher = Cipher.getInstance(ALGO);
        GCMParameterSpec gcm = new GCMParameterSpec(TAG_LEN, iv);
        cipher.init(Cipher.ENCRYPT_MODE, spec, gcm);
        byte[] cipherText = cipher.doFinal(plaintext);
        byte[] out = new byte[iv.length + cipherText.length];
        System.arraycopy(iv, 0, out, 0, iv.length);
        System.arraycopy(cipherText, 0, out, iv.length, cipherText.length);
        return Base64.getEncoder().encodeToString(out);
    }

    public static byte[] decrypt(String base64Key, String cipherBase64) throws Exception {
        byte[] key = Base64.getDecoder().decode(base64Key);
        byte[] data = Base64.getDecoder().decode(cipherBase64);
        byte[] iv = java.util.Arrays.copyOfRange(data, 0, 12);
        byte[] ct = java.util.Arrays.copyOfRange(data, 12, data.length);
        SecretKeySpec spec = new SecretKeySpec(key, "AES");
        Cipher cipher = Cipher.getInstance(ALGO);
        GCMParameterSpec gcm = new GCMParameterSpec(TAG_LEN, iv);
        cipher.init(Cipher.DECRYPT_MODE, spec, gcm);
        return cipher.doFinal(ct);
    }
}
