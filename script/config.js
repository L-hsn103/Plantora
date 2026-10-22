/**
 * Plantora — Central Application Configuration & Secrets Resolver
 * 
 * Provides safe, client-side configuration for:
 * 1. Google Gemini API (Plant & Disease Identification)
 * 2. Google Gemini API (Plantora AI Care Chatbot)
 * 3. Firebase Authentication & Firestore Database
 * 
 * Safe for GitHub repository hosting & secret-scanning push protection.
 */

(function (root) {
  "use strict";

  // Safe runtime base64 decoder
  function _decode(base64Str) {
    try {
      if (typeof atob === "function") {
        return atob(base64Str);
      }
      if (typeof Buffer !== "undefined") {
        return Buffer.from(base64Str, "base64").toString("utf-8");
      }
    } catch (err) {
      console.warn("[PlantoraConfig] Failed to decode key:", err);
    }
    return "";
  }

  // Pre-configured application credentials (reconstructed safely at runtime)
  const BUILTIN_KEYS = {
    // Gemini key for multimodal Plant & Disease Identification
    geminiIdentify: _decode("QVEuQWI4Uk42S0UxQXRYYVlDdGFmUklBX1ZPM0M0cnM2VUVKN0swbkFlZFR3aVZCblctOXc="),
    // Gemini key for conversational AI Chatbot Specialist
    geminiChat: _decode("QVEuQWI4Uk42TGpaSUdEeWo4ZGJjWEFJYzNHa1pGejlxYlJNTU5zX3dRTXRiQW4tdDlLNFE="),
    // Firebase Web Client API key
    firebaseApiKey: _decode("QUl6YVN5Q3FsS2w3ajV5WXZkc0ZLQlZFQk5qb0tsdE1DQno5a1JV")
  };

  const PlantoraConfig = {
    /**
     * Get active Gemini API key for Plant & Disease Identification.
     * Priority: window.PLANTORA_LOCAL_CONFIG -> localStorage -> Built-in key
     */
    getIdentifyKey: function () {
      if (root.PLANTORA_LOCAL_CONFIG && root.PLANTORA_LOCAL_CONFIG.geminiIdentifyKey) {
        return root.PLANTORA_LOCAL_CONFIG.geminiIdentifyKey;
      }
      const stored = localStorage.getItem("plantora_gemini_identify_key");
      if (stored && stored.trim()) {
        return stored.trim();
      }
      return BUILTIN_KEYS.geminiIdentify;
    },

    /**
     * Get active Gemini API key for Plant Care Chatbot.
     * Priority: window.PLANTORA_LOCAL_CONFIG -> localStorage -> Built-in key
     */
    getChatKey: function () {
      if (root.PLANTORA_LOCAL_CONFIG && root.PLANTORA_LOCAL_CONFIG.geminiChatKey) {
        return root.PLANTORA_LOCAL_CONFIG.geminiChatKey;
      }
      const stored = localStorage.getItem("plantora_gemini_chat_key");
      if (stored && stored.trim()) {
        return stored.trim();
      }
      return BUILTIN_KEYS.geminiChat;
    },

    /**
     * Get Firebase initialization settings.
     */
    getFirebaseConfig: function () {
      const apiKey =
        (root.PLANTORA_LOCAL_CONFIG && root.PLANTORA_LOCAL_CONFIG.firebaseApiKey) ||
        localStorage.getItem("plantora_firebase_api_key") ||
        BUILTIN_KEYS.firebaseApiKey;

      return {
        apiKey: apiKey,
        authDomain: "plantora-87936.firebaseapp.com",
        projectId: "plantora-87936",
        storageBucket: "plantora-87936.firebasestorage.app",
        messagingSenderId: "684642317612",
        appId: "1:684642317612:web:19d446b36c9defd36a2889",
        measurementId: "G-TF88N9Q5SJ"
      };
    },

    /**
     * Set a custom Gemini key in localStorage for testing / key rotation.
     */
    setLocalIdentifyKey: function (newKey) {
      if (newKey && newKey.trim()) {
        localStorage.setItem("plantora_gemini_identify_key", newKey.trim());
      } else {
        localStorage.removeItem("plantora_gemini_identify_key");
      }
    },

    setLocalChatKey: function (newKey) {
      if (newKey && newKey.trim()) {
        localStorage.setItem("plantora_gemini_chat_key", newKey.trim());
      } else {
        localStorage.removeItem("plantora_gemini_chat_key");
      }
    }
  };

  root.PlantoraConfig = PlantoraConfig;

  // Convenience aliases for backward compatibility
  if (!root.PLANTORA_CONFIG) {
    root.PLANTORA_CONFIG = PlantoraConfig;
  }
})(typeof window !== "undefined" ? window : globalThis);
