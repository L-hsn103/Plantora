/**
 * Plantora — AI Plant & Disease Identification Engine
 * Powered by Google Gemini API
 */

(function () {
  "use strict";

  // ===== Gemini API Configuration & Key Resolution =====
  // Priority:
  // 1. window.PLANTORA_CONFIG.GEMINI_API_KEY (from script/config.js, git-ignored)
  // 2. window.__PLANTORA_CONFIG__.GEMINI_API_KEY
  // 3. localStorage "PLANTORA_GEMINI_API_KEY" (saved from in-app settings modal)
  function getGeminiApiKey() {
    if (window.PLANTORA_CONFIG && typeof window.PLANTORA_CONFIG.GEMINI_API_KEY === "string") {
      const k = window.PLANTORA_CONFIG.GEMINI_API_KEY.trim();
      if (k && k !== "YOUR_GEMINI_API_KEY_HERE") return k;
    }
    if (window.__PLANTORA_CONFIG__ && typeof window.__PLANTORA_CONFIG__.GEMINI_API_KEY === "string") {
      const k = window.__PLANTORA_CONFIG__.GEMINI_API_KEY.trim();
      if (k && k !== "YOUR_GEMINI_API_KEY_HERE") return k;
    }
    try {
      const stored = localStorage.getItem("PLANTORA_GEMINI_API_KEY");
      if (stored && stored.trim() && stored.trim() !== "YOUR_GEMINI_API_KEY_HERE") {
        return stored.trim();
      }
    } catch (e) {}
    return "";
  }

  function setGeminiApiKey(key) {
    const cleaned = (key || "").trim();
    try {
      if (cleaned) {
        localStorage.setItem("PLANTORA_GEMINI_API_KEY", cleaned);
      } else {
        localStorage.removeItem("PLANTORA_GEMINI_API_KEY");
      }
    } catch (e) {}
    if (!window.PLANTORA_CONFIG) window.PLANTORA_CONFIG = {};
    window.PLANTORA_CONFIG.GEMINI_API_KEY = cleaned;
  }

  function getKeySourceInfo() {
    if (window.PLANTORA_CONFIG && window.PLANTORA_CONFIG.GEMINI_API_KEY && window.PLANTORA_CONFIG.GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE") {
      return { active: true, source: "script/config.js (Local File)", isLocalFile: true };
    }
    try {
      const stored = localStorage.getItem("PLANTORA_GEMINI_API_KEY");
      if (stored && stored.trim() && stored.trim() !== "YOUR_GEMINI_API_KEY_HERE") {
        return { active: true, source: "Browser LocalStorage", isLocalFile: false };
      }
    } catch (e) {}
    return { active: false, source: "Not configured", isLocalFile: false };
  }

  const PRIMARY_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-2.5-pro"
  ];

  // Resolve assets relative to this script so it works from root or /pages/
  const ASSETS_ROOT = (function () {
    const script = document.currentScript;
    return script ? new URL("../assets/image/", script.src).href : "../assets/image/";
  })();

  // Built-in sample plants for instant demonstration & testing
  const SAMPLE_PLANTS = [
    {
      id: "monstera",
      name: "Monstera Deliciosa",
      subtitle: "Thriving & Healthy",
      status: "Healthy",
      tagType: "healthy",
      image: ASSETS_ROOT + "hero-plant.jpg"
    },
    {
      id: "snake",
      name: "Snake Plant",
      subtitle: "Dracaena trifasciata",
      status: "Healthy",
      tagType: "healthy",
      image: ASSETS_ROOT + "plant/snake-plant.webp"
    },
    {
      id: "peacelily",
      name: "Peace Lily",
      subtitle: "Underwatering Stress",
      status: "Needs Attention",
      tagType: "issue",
      image: ASSETS_ROOT + "plant/peace-lily.webp"
    },
    {
      id: "pothos",
      name: "Golden Pothos",
      subtitle: "Nutrient / Light issue",
      status: "Leaf Yellowing",
      tagType: "issue",
      image: ASSETS_ROOT + "plant/money-plant-pothos.webp"
    }
  ];

  // Helper: Downscale image on canvas to max 1280px for fast transmission
  function processAndCompressImage(fileOrDataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.88);
        const base64Only = compressedDataUrl.split(",")[1];
        resolve({
          dataUrl: compressedDataUrl,
          base64: base64Only,
          mimeType: "image/jpeg"
        });
      };
      img.onerror = (err) => reject(new Error("Unable to read image file"));

      if (typeof fileOrDataUrl === "string") {
        img.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => (img.src = e.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(fileOrDataUrl);
      }
    });
  }

  // Helper: Call Gemini API with automatic fallback models
  async function callGeminiVision(base64Data, mimeType) {
    const prompt = `
You are a world-class plant pathologist, botanist, and indoor plant specialist for the Plantora platform.
Carefully examine this image. First determine if it contains a plant, flower, leaf, or botanical specimen.

If the image DOES NOT contain a plant or plant part, respond in JSON with:
{
  "isPlant": false,
  "message": "We could not detect a plant in this photo. Please upload or capture a clear photo of your plant leaves, stem, or flowers."
}

If the image DOES contain a plant, thoroughly identify the plant species and diagnose its health, including any diseases, pests, fungal infections, nutrient deficiencies, or environmental stress (overwatering, underwatering, sunburn, low humidity, etc.). If the plant is completely healthy, celebrate its health and state 'None - Plant is Healthy'.

Respond strictly in valid JSON matching this exact structure:
{
  "isPlant": true,
  "plantName": "Common Plant Name (e.g. Swiss Cheese Plant)",
  "scientificName": "Botanical Latin Name (e.g. Monstera deliciosa)",
  "family": "Plant Family or Group (e.g. Araceae / Tropical Indoor Aroid)",
  "confidence": 98,
  "healthStatus": "Healthy" | "Diseased" | "Needs Attention",
  "diseaseName": "Specific name of disease, deficiency, or 'None - Plant is Healthy'",
  "diseaseSeverity": "None" | "Mild" | "Moderate" | "Severe",
  "symptoms": ["Symptom 1 observed in photo", "Symptom 2", "Symptom 3"],
  "summary": "2-3 clear, professional sentences explaining the plant diagnosis and current state.",
  "careRequirements": {
    "light": "Exact sunlight / exposure requirement (e.g. Bright indirect sunlight)",
    "watering": "Exact watering schedule and soil moisture advice",
    "humidity": "Recommended humidity range (e.g. 50-60% or higher)",
    "temperature": "Ideal temperature range in °F and °C (e.g. 65°F - 85°F / 18°C - 29°C)",
    "soil": "Best potting mix formulation and drainage"
  },
  "treatmentAndRecoveryPlan": "Comprehensive, encouraging, and detailed instructions on how the user can overcome this disease/stress, save the plant, and nurse it back to vibrant health. If healthy, explain how to keep it thriving.",
  "actionSteps": [
    "Step 1: Immediate action (e.g. isolate, prune affected leaves with sanitized shears)",
    "Step 2: Corrective treatment (e.g. apply organic neem oil or adjust watering interval)",
    "Step 3: Long-term preventative care (e.g. monitor new growth, optimize light)"
  ]
}
`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.15,
        response_mime_type: "application/json"
      }
    };

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new Error("MISSING_API_KEY");
    }

    let lastError = null;

    for (const model of PRIMARY_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[Plantora Gemini] Model ${model} returned ${response.status}:`, errText);
          lastError = new Error(`API Error (${response.status}): ${errText}`);
          continue; // Try next fallback model
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error("No response text received from AI model");
        }

        // Clean any accidental markdown codeblock wrappers
        let cleanJson = rawText.trim();
        if (cleanJson.startsWith("```json")) {
          cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const parsed = JSON.parse(cleanJson);
        return parsed;
      } catch (err) {
        console.warn(`[Plantora Gemini] Attempt with ${model} failed:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error("Failed to connect to Gemini API. Please check your internet connection.");
  }

  // Toast notification helper
  function showToast(message, icon = "check") {
    let toast = document.getElementById("identify-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "identify-toast";
      toast.className = "identify-toast";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i data-lucide="${icon}"></i> <span>${message}</span>`;
    if (window.PlantoraIcons && window.PlantoraIcons.refresh) {
      window.PlantoraIcons.refresh();
    }
    toast.classList.add("is-shown");
    setTimeout(() => {
      toast.classList.remove("is-shown");
    }, 3500);
  }

  // ===== Plant Identification Component Controller =====
  class PlantIdentifier {
    constructor(container, options = {}) {
      this.container = container;
      this.options = options;
      this.currentStream = null;
      this.currentCameraFacing = "environment"; // default to rear camera
      this.selectedImageData = null;
      this.isAnalyzing = false;
      this.lastResult = null;
      this.statusInterval = null;

      this.init();
    }

    init() {
      this.render();
      this.bindEvents();
    }

    render() {
      this.container.innerHTML = `
        <div class="identify-card" id="identify-main-card">
          <div class="identify-card-top">
            <button type="button" class="identify-key-pill" id="btn-open-key-settings" title="Manage Gemini API Key">
              <span class="identify-key-pill__dot" id="key-pill-dot"></span>
              <i data-lucide="key" style="width:13px;height:13px;"></i>
              <span id="key-pill-label">API Key</span>
            </button>
          </div>

          <!-- Mode Tabs -->
          <div class="identify-tabs" role="tablist">
            <button type="button" class="identify-tab-btn is-active" data-tab="upload" role="tab" aria-selected="true">
              <i data-lucide="upload-cloud"></i> Upload Image
            </button>
            <button type="button" class="identify-tab-btn" data-tab="camera" role="tab" aria-selected="false">
              <i data-lucide="camera"></i> Take Picture
            </button>
            <button type="button" class="identify-tab-btn" data-tab="sample" role="tab" aria-selected="false">
              <i data-lucide="sparkles"></i> Try Samples
            </button>
          </div>

          <!-- Tab Pane: Upload -->
          <div class="identify-pane" id="pane-upload">
            <div class="identify-dropzone" id="identify-dropzone" tabindex="0" role="button" aria-label="Upload plant image">
              <input type="file" id="identify-file-input" accept="image/*" style="display:none;" />
              <div class="identify-dropzone__icon-wrap">
                <i data-lucide="image-plus"></i>
              </div>
              <h3>Drag &amp; Drop or Browse Image</h3>
              <p>Upload a clear photo of your plant leaves, stems, or flowers for instant AI diagnosis.</p>
              <div class="identify-dropzone__formats">Supports JPG, PNG, WEBP &bull; Max 20MB</div>
              <button type="button" class="btn btn--secondary" style="margin-top:0.5rem;" id="btn-browse-file">
                <i data-lucide="folder-open" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i> Browse Photo
              </button>
            </div>
          </div>

          <!-- Tab Pane: Camera -->
          <div class="identify-pane" id="pane-camera" hidden>
            <div class="identify-camera-wrap">
              <div class="camera-viewfinder" id="camera-viewfinder">
                <video class="camera-video" id="camera-video" autoplay playsinline muted></video>
                <div class="camera-reticle"></div>
                <div class="camera-flash-overlay" id="camera-flash"></div>
              </div>
              <div class="camera-controls">
                <button type="button" class="camera-btn camera-btn--switch" id="btn-switch-camera" title="Switch Camera" aria-label="Switch Camera">
                  <i data-lucide="refresh-cw"></i>
                </button>
                <button type="button" class="camera-btn camera-btn--capture" id="btn-capture-photo" title="Take Picture" aria-label="Take Picture">
                  <i data-lucide="camera"></i>
                </button>
                <button type="button" class="camera-btn camera-btn--switch" id="btn-stop-camera" title="Cancel Camera" aria-label="Close Camera">
                  <i data-lucide="x"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Tab Pane: Samples -->
          <div class="identify-pane" id="pane-sample" hidden>
            <div class="sample-plants-section" style="margin-top:0; border-top:none; padding-top:0;">
              <div class="sample-plants-header">
                <div>
                  <h4>Select a Demonstration Plant</h4>
                  <p>Test the Gemini AI identification immediately with one of our curated plant specimens.</p>
                </div>
              </div>
              <div class="sample-plants-grid">
                ${SAMPLE_PLANTS.map(
                  (p) => `
                  <button type="button" class="sample-plant-card" data-sample-id="${p.id}" data-sample-img="${p.image}">
                    <img src="${p.image}" alt="${p.name}" class="sample-plant-card__img" />
                    <div class="sample-plant-card__name">${p.name}</div>
                    <span class="sample-plant-card__tag sample-plant-card__tag--${p.tagType}">
                      ${p.status}
                    </span>
                  </button>
                `
                ).join("")}
              </div>
            </div>
          </div>

          <!-- Stage: Image Preview & Confirmation (before/during analysis) -->
          <div class="identify-preview-stage" id="identify-preview-stage" hidden>
            <div class="preview-media-card" id="preview-media-card">
              <img id="preview-image" src="" alt="Selected plant preview" />
              <div class="preview-scan-laser"></div>
              <div class="preview-scan-grid"></div>
            </div>

            <!-- Loading Spinner & Status Text -->
            <div class="identify-loading-box" id="identify-loading-box" hidden>
              <div class="spinner spinner--lg" style="margin:0 auto;" aria-hidden="true"></div>
              <div class="identify-loading-msg" id="loading-status-text">Examining plant morphology...</div>
              <div class="identify-loading-sub">Connecting with Google Gemini Multimodal AI</div>
              <div class="identify-loading-progress">
                <div class="identify-loading-progress__fill"></div>
              </div>
            </div>

            <!-- Preview Actions Buttons -->
            <div class="preview-actions" id="preview-actions">
              <button type="button" class="btn btn--secondary" id="btn-retake-photo">
                <i data-lucide="rotate-ccw" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i> Choose Another Photo
              </button>
              <button type="button" class="btn btn--primary" id="btn-start-identify">
                <i data-lucide="sparkles" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i> Identify Plant &amp; Diagnose
              </button>
            </div>
          </div>

          <!-- Stage: Diagnostics Results View -->
          <div class="diagnostics-result" id="diagnostics-result" hidden></div>
        </div>
      `;

      if (window.PlantoraIcons && window.PlantoraIcons.refresh) {
        window.PlantoraIcons.refresh();
      }
    }

    bindEvents() {
      // Tab Switching
      const tabButtons = this.container.querySelectorAll(".identify-tab-btn");
      tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const tab = btn.dataset.tab;
          this.switchTab(tab);
        });
      });

      // Upload triggers
      const dropzone = this.container.querySelector("#identify-dropzone");
      const fileInput = this.container.querySelector("#identify-file-input");
      const btnBrowse = this.container.querySelector("#btn-browse-file");

      if (btnBrowse && fileInput) {
        btnBrowse.addEventListener("click", (e) => {
          e.stopPropagation();
          fileInput.click();
        });
      }

      if (dropzone && fileInput) {
        dropzone.addEventListener("click", () => fileInput.click());

        dropzone.addEventListener("dragover", (e) => {
          e.preventDefault();
          dropzone.classList.add("is-dragover");
        });

        dropzone.addEventListener("dragleave", () => {
          dropzone.classList.remove("is-dragover");
        });

        dropzone.addEventListener("drop", (e) => {
          e.preventDefault();
          dropzone.classList.remove("is-dragover");
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            this.handleSelectedFile(e.dataTransfer.files[0]);
          }
        });

        fileInput.addEventListener("change", (e) => {
          if (e.target.files && e.target.files[0]) {
            this.handleSelectedFile(e.target.files[0]);
          }
        });
      }

      // Camera triggers
      const btnCapture = this.container.querySelector("#btn-capture-photo");
      if (btnCapture) {
        btnCapture.addEventListener("click", () => this.captureSnapshot());
      }

      const btnSwitchCam = this.container.querySelector("#btn-switch-camera");
      if (btnSwitchCam) {
        btnSwitchCam.addEventListener("click", () => this.toggleCameraFacing());
      }

      const btnStopCam = this.container.querySelector("#btn-stop-camera");
      if (btnStopCam) {
        btnStopCam.addEventListener("click", () => {
          this.stopCameraStream();
          this.switchTab("upload");
        });
      }

      // Sample plant cards
      const sampleCards = this.container.querySelectorAll(".sample-plant-card");
      sampleCards.forEach((card) => {
        card.addEventListener("click", () => {
          const imgUrl = card.dataset.sampleImg;
          this.loadSampleImage(imgUrl);
        });
      });

      // Preview actions
      const btnStartIdentify = this.container.querySelector("#btn-start-identify");
      if (btnStartIdentify) {
        btnStartIdentify.addEventListener("click", () => this.executeIdentification());
      }

      const btnRetake = this.container.querySelector("#btn-retake-photo");
      if (btnRetake) {
        btnRetake.addEventListener("click", () => this.resetToSelector());
      }

      // API Key Settings Pill
      const btnKeySettings = this.container.querySelector("#btn-open-key-settings");
      if (btnKeySettings) {
        btnKeySettings.addEventListener("click", () => this.openApiKeyModal());
      }
      this.updateKeyPill();
    }

    switchTab(tab) {
      const tabButtons = this.container.querySelectorAll(".identify-tab-btn");
      tabButtons.forEach((b) => {
        const isActive = b.dataset.tab === tab;
        b.classList.toggle("is-active", isActive);
        b.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      const paneUpload = this.container.querySelector("#pane-upload");
      const paneCamera = this.container.querySelector("#pane-camera");
      const paneSample = this.container.querySelector("#pane-sample");

      paneUpload.hidden = tab !== "upload";
      paneCamera.hidden = tab !== "camera";
      paneSample.hidden = tab !== "sample";

      if (tab === "camera") {
        this.startCameraStream();
      } else {
        this.stopCameraStream();
      }

      if (window.PlantoraIcons && window.PlantoraIcons.refresh) {
        window.PlantoraIcons.refresh();
      }
    }

    async startCameraStream() {
      const video = this.container.querySelector("#camera-video");
      if (!video) return;

      this.stopCameraStream();

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API is not supported in this browser environment.");
        }

        const constraints = {
          video: {
            facingMode: this.currentCameraFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.currentStream = stream;
        video.srcObject = stream;
        await video.play();
      } catch (err) {
        console.warn("[Plantora Camera] Unable to access camera:", err);
        const paneCamera = this.container.querySelector("#pane-camera");
        if (paneCamera) {
          paneCamera.innerHTML = `
            <div class="empty-state" style="padding: 2.5rem 1rem;">
              <div class="quick-action-card__icon" style="margin: 0 auto 1rem;"><i data-lucide="camera-off"></i></div>
              <h3>Camera Access Unavailable</h3>
              <p style="max-width: 420px; margin: 0 auto 1.5rem; color: var(--color-text-muted);">
                ${err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
                  ? "Camera permission was denied. Please allow camera permissions in your browser or switch to file upload."
                  : "We could not find an active camera device or your browser permissions require HTTPS. You can easily upload any plant photo instead!"}
              </p>
              <button type="button" class="btn btn--primary" id="btn-fallback-upload">
                <i data-lucide="upload-cloud" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i> Use File Upload
              </button>
            </div>
          `;
          const btnFallback = paneCamera.querySelector("#btn-fallback-upload");
          if (btnFallback) {
            btnFallback.addEventListener("click", () => this.switchTab("upload"));
          }
          if (window.PlantoraIcons && window.PlantoraIcons.refresh) {
            window.PlantoraIcons.refresh();
          }
        }
      }
    }

    stopCameraStream() {
      if (this.currentStream) {
        this.currentStream.getTracks().forEach((track) => track.stop());
        this.currentStream = null;
      }
      const video = this.container.querySelector("#camera-video");
      if (video) {
        video.srcObject = null;
      }
    }

    toggleCameraFacing() {
      this.currentCameraFacing = this.currentCameraFacing === "environment" ? "user" : "environment";
      this.startCameraStream();
    }

    captureSnapshot() {
      const video = this.container.querySelector("#camera-video");
      const flash = this.container.querySelector("#camera-flash");
      if (!video) return;

      // Shutter flash animation
      if (flash) {
        flash.classList.add("is-flashing");
        setTimeout(() => flash.classList.remove("is-flashing"), 200);
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");

      // Handle front camera mirroring if needed
      if (this.currentCameraFacing === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

      this.stopCameraStream();

      processAndCompressImage(dataUrl).then((processed) => {
        this.selectedImageData = processed;
        this.showPreviewStage(processed.dataUrl);
      });
    }

    async handleSelectedFile(file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file (PNG, JPG, or WEBP).");
        return;
      }

      try {
        const processed = await processAndCompressImage(file);
        this.selectedImageData = processed;
        this.showPreviewStage(processed.dataUrl);
      } catch (err) {
        alert("Error loading image: " + err.message);
      }
    }

    async loadSampleImage(imageUrl) {
      try {
        // Fetch sample plant and convert to blob
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const processed = await processAndCompressImage(blob);
        this.selectedImageData = processed;
        this.showPreviewStage(processed.dataUrl);
      } catch (err) {
        console.error("Failed to load sample:", err);
        // Fallback: load directly into image
        this.selectedImageData = {
          dataUrl: imageUrl,
          base64: null,
          mimeType: "image/jpeg"
        };
        this.showPreviewStage(imageUrl);
      }
    }

    showPreviewStage(dataUrl) {
      this.container.querySelectorAll(".identify-pane").forEach((p) => (p.hidden = true));
      this.container.querySelector(".identify-tabs").hidden = true;

      const previewStage = this.container.querySelector("#identify-preview-stage");
      const previewImg = this.container.querySelector("#preview-image");
      const previewActions = this.container.querySelector("#preview-actions");
      const loadingBox = this.container.querySelector("#identify-loading-box");
      const resultsView = this.container.querySelector("#diagnostics-result");

      resultsView.hidden = true;
      loadingBox.hidden = true;
      previewActions.hidden = false;
      previewStage.hidden = false;

      previewImg.src = dataUrl;

      if (window.PlantoraIcons && window.PlantoraIcons.refresh) {
        window.PlantoraIcons.refresh();
      }
    }

    resetToSelector() {
      this.stopCameraStream();
      this.selectedImageData = null;
      this.lastResult = null;

      if (this.statusInterval) {
        clearInterval(this.statusInterval);
        this.statusInterval = null;
      }

      const previewCard = this.container.querySelector("#preview-media-card");
      if (previewCard) previewCard.classList.remove("is-scanning");

      this.container.querySelector("#identify-preview-stage").hidden = true;
      this.container.querySelector("#diagnostics-result").hidden = true;
      this.container.querySelector(".identify-tabs").hidden = false;

      const activeTabBtn = this.container.querySelector(".identify-tab-btn.is-active");
      const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : "upload";
      this.switchTab(activeTab);
    }

    async executeIdentification() {
      if (!this.selectedImageData || this.isAnalyzing) return;

      this.isAnalyzing = true;
      const previewCard = this.container.querySelector("#preview-media-card");
      const previewActions = this.container.querySelector("#preview-actions");
      const loadingBox = this.container.querySelector("#identify-loading-box");
      const statusText = this.container.querySelector("#loading-status-text");

      previewActions.hidden = true;
      loadingBox.hidden = false;
      if (previewCard) previewCard.classList.add("is-scanning");

      const statusMessages = [
        "Analyzing leaf structure & venation...",
        "Querying botanical taxonomy database...",
        "Inspecting discoloration & pathological signs...",
        "Formulating tailored plant care & recovery plan..."
      ];
      let msgIdx = 0;
      this.statusInterval = setInterval(() => {
        msgIdx = (msgIdx + 1) % statusMessages.length;
        if (statusText) statusText.textContent = statusMessages[msgIdx];
      }, 950);

      try {
        let base64 = this.selectedImageData.base64;
        let mime = this.selectedImageData.mimeType;

        // If sample image wasn't processed yet, process now
        if (!base64 && this.selectedImageData.dataUrl) {
          const res = await fetch(this.selectedImageData.dataUrl);
          const blob = await res.blob();
          const proc = await processAndCompressImage(blob);
          base64 = proc.base64;
          mime = proc.mimeType;
        }

        const diagnostics = await callGeminiVision(base64, mime);
        this.lastResult = diagnostics;

        clearInterval(this.statusInterval);
        this.statusInterval = null;
        if (previewCard) previewCard.classList.remove("is-scanning");

        this.renderDiagnostics(diagnostics);
      } catch (err) {
        clearInterval(this.statusInterval);
        this.statusInterval = null;
        if (previewCard) previewCard.classList.remove("is-scanning");

        console.error("[Plantora AI] Analysis error:", err);
        loadingBox.hidden = true;
        previewActions.hidden = false;
        if (err.message === "MISSING_API_KEY") {
          this.openApiKeyModal(() => {
            this.executeIdentification();
          });
        } else {
          alert("Identification service error: " + err.message + "\nPlease try again or test with another photo.");
        }
      } finally {
        this.isAnalyzing = false;
      }
    }

    renderDiagnostics(data) {
      const previewStage = this.container.querySelector("#identify-preview-stage");
      const resultsView = this.container.querySelector("#diagnostics-result");

      previewStage.hidden = true;
      resultsView.hidden = false;

      // Handle non-plant image
      if (!data.isPlant) {
        resultsView.innerHTML = `
          <div class="empty-state" style="padding:3rem 1.5rem; text-align:center;">
            <div class="quick-action-card__icon" style="margin:0 auto 1.25rem; width:60px; height:60px;">
              <i data-lucide="help-circle" style="width:30px; height:30px; color:var(--id-amber-500);"></i>
            </div>
            <h2 style="font-family:var(--font-heading); margin-bottom:0.75rem;">No Plant Detected</h2>
            <p style="max-width:520px; margin:0 auto 2rem; color:var(--color-text-muted); font-size:1rem;">
              ${data.message || "We could not reliably identify a plant or leaf in this photo. Please try uploading or capturing a clearer photo with good lighting."}
            </p>
            <button type="button" class="btn btn--primary" id="btn-result-retry">
              <i data-lucide="refresh-cw" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i> Try Another Photo
            </button>
          </div>
        `;

        const btnRetry = resultsView.querySelector("#btn-result-retry");
        if (btnRetry) btnRetry.addEventListener("click", () => this.resetToSelector());
        if (window.PlantoraIcons && window.PlantoraIcons.refresh) window.PlantoraIcons.refresh();
        return;
      }

      // Determine Health Indicator styling
      const isHealthy = (data.healthStatus || "").toLowerCase() === "healthy";
      const isAttention = (data.healthStatus || "").toLowerCase().includes("attention");
      const healthPillClass = isHealthy
        ? "health-pill--healthy"
        : isAttention
        ? "health-pill--attention"
        : "health-pill--diseased";

      const healthIcon = isHealthy ? "check-circle-2" : isAttention ? "alert-triangle" : "alert-circle";

      // Disease severity styling
      const severity = (data.diseaseSeverity || "None").toLowerCase();
      const severityClass = `disease-severity--${severity}`;
      const diseaseBannerClass = isHealthy
        ? "disease-banner"
        : isAttention
        ? "disease-banner disease-banner--warn"
        : "disease-banner disease-banner--alert";

      resultsView.innerHTML = `
        <!-- Top Plant Header Banner -->
        <div class="diagnostics-header">
          <div class="diagnostics-header__info">
            <div class="diagnostics-header__badges">
              <span class="health-pill ${healthPillClass}">
                <i data-lucide="${healthIcon}" style="width:14px;height:14px;"></i>
                ${data.healthStatus || "Healthy"}
              </span>
              <span class="conf-badge">
                <i data-lucide="sparkles" style="width:13px;height:13px;"></i>
                ${data.confidence || 98}% Confidence
              </span>
              ${data.family ? `<span class="count-badge">${data.family}</span>` : ""}
            </div>
            <h2>${data.plantName || "Identified Plant"}</h2>
            <div class="scientific-name">${data.scientificName || ""}</div>
          </div>
          <img src="${this.selectedImageData?.dataUrl || ""}" alt="${data.plantName}" class="diagnostics-header__thumb" />
        </div>

        <!-- Two Column Diagnostics Breakdown -->
        <div class="diagnostics-grid">

          <!-- Left Card: Health & Disease Pathology -->
          <article class="diagnostics-card">
            <div class="diagnostics-card__header">
              <div class="diagnostics-card__icon ${isHealthy ? "" : "diagnostics-card__icon--disease"}">
                <i data-lucide="${isHealthy ? "shield-check" : "microscope"}"></i>
              </div>
              <h3>Health &amp; Disease Diagnosis</h3>
            </div>

            <div class="${diseaseBannerClass}">
              <div>
                <div class="disease-banner__title">${data.diseaseName || "No Diseases Detected"}</div>
                <div style="font-size:0.85rem; color:var(--color-text-muted); margin-top:2px;">
                  ${isHealthy ? "Plant foliage and physiological state are healthy." : "Pathological analysis and symptoms detected."}
                </div>
              </div>
              <span class="disease-severity ${severityClass}">${data.diseaseSeverity || "None"}</span>
            </div>

            ${
              data.symptoms && data.symptoms.length > 0
                ? `
              <div>
                <div style="font-size:0.85rem; font-weight:600; margin-bottom:0.35rem; color:var(--color-primary-dark);">Observed Symptoms:</div>
                <div class="symptoms-tags">
                  ${data.symptoms.map((s) => `<span class="symptom-tag"><i data-lucide="check" style="width:12px;height:12px;vertical-align:middle;margin-right:4px;"></i>${s}</span>`).join("")}
                </div>
              </div>
            `
                : ""
            }

            <p style="font-size:0.92rem; color:var(--color-text-muted); line-height:1.6; margin:0;">
              ${data.summary || ""}
            </p>
          </article>

          <!-- Right Card: How to Overcome & Treatment Plan -->
          <article class="diagnostics-card">
            <div class="diagnostics-card__header">
              <div class="diagnostics-card__icon diagnostics-card__icon--treatment">
                <i data-lucide="heart-pulse"></i>
              </div>
              <h3>How to Save &amp; Protect Your Plant</h3>
            </div>

            <p style="font-size:0.92rem; color:var(--color-text); line-height:1.6; margin:0;">
              ${data.treatmentAndRecoveryPlan || "Follow standard recommended care parameters to support steady new growth."}
            </p>

            ${
              data.actionSteps && data.actionSteps.length > 0
                ? `
              <div style="margin-top:0.5rem;">
                <div style="font-size:0.85rem; font-weight:600; margin-bottom:0.5rem; color:var(--color-primary-dark);">Step-by-Step Action Plan:</div>
                <ul class="action-steps-list">
                  ${data.actionSteps
                    .map(
                      (step, idx) => `
                    <li class="action-step-item">
                      <span class="action-step-num">${idx + 1}</span>
                      <span>${step.replace(/^Step\s*\d+:\s*/i, "")}</span>
                    </li>
                  `
                    )
                    .join("")}
                </ul>
              </div>
            `
                : ""
            }
          </article>

        </div>

        <!-- Care Requirements Spec Grid -->
        <article class="diagnostics-card" style="margin-bottom:2rem;">
          <div class="diagnostics-card__header">
            <div class="diagnostics-card__icon">
              <i data-lucide="sun"></i>
            </div>
            <h3>Optimal Care Requirements</h3>
          </div>

          <div class="care-specs-grid">
            <div class="care-spec-card">
              <div class="care-spec-icon"><i data-lucide="sun"></i></div>
              <div class="care-spec-label">Light</div>
              <div class="care-spec-val">${data.careRequirements?.light || "Bright Indirect"}</div>
            </div>

            <div class="care-spec-card">
              <div class="care-spec-icon"><i data-lucide="droplets"></i></div>
              <div class="care-spec-label">Watering</div>
              <div class="care-spec-val">${data.careRequirements?.watering || "Moderate"}</div>
            </div>

            <div class="care-spec-card">
              <div class="care-spec-icon"><i data-lucide="wind"></i></div>
              <div class="care-spec-label">Humidity</div>
              <div class="care-spec-val">${data.careRequirements?.humidity || "50% - 60%"}</div>
            </div>

            <div class="care-spec-card">
              <div class="care-spec-icon"><i data-lucide="thermometer"></i></div>
              <div class="care-spec-label">Temperature</div>
              <div class="care-spec-val">${data.careRequirements?.temperature || "65°F - 80°F"}</div>
            </div>

            <div class="care-spec-card">
              <div class="care-spec-icon"><i data-lucide="layers"></i></div>
              <div class="care-spec-label">Soil &amp; Pot</div>
              <div class="care-spec-val">${data.careRequirements?.soil || "Well Draining"}</div>
            </div>
          </div>
        </article>

        <!-- Footer Actions -->
        <div class="diagnostics-footer">
          <button type="button" class="btn btn--secondary" id="btn-diagnose-another">
            <i data-lucide="scan" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i> Identify Another Plant
          </button>

          <div class="diagnostics-footer__primary">
            <button type="button" class="btn btn--secondary" id="btn-print-diagnosis">
              <i data-lucide="printer" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i> Print Care Sheet
            </button>
            <button type="button" class="btn btn--primary" id="btn-save-to-myplants">
              <i data-lucide="plus-circle" style="width:16px;height:16px;vertical-align:middle;margin-right:6px;"></i> Add to My Plants
            </button>
          </div>
        </div>
      `;

      // Bind result buttons
      const btnScanAnother = resultsView.querySelector("#btn-diagnose-another");
      if (btnScanAnother) {
        btnScanAnother.addEventListener("click", () => this.resetToSelector());
      }

      const btnPrint = resultsView.querySelector("#btn-print-diagnosis");
      if (btnPrint) {
        btnPrint.addEventListener("click", () => window.print());
      }

      const btnSave = resultsView.querySelector("#btn-save-to-myplants");
      if (btnSave) {
        btnSave.addEventListener("click", () => this.saveToMyPlants(data));
      }

      if (window.PlantoraIcons && window.PlantoraIcons.refresh) {
        window.PlantoraIcons.refresh();
      }
    }

    async saveToMyPlants(plantData) {
      try {
        const user = window.PlantoraStore ? window.PlantoraStore.getCurrentUser() : null;

        // Try to find matching plant in Plantora catalog if available
        let catalogId = null;
        if (window.PlantoraData && window.PlantoraData.loadPlants) {
          try {
            const catalog = await window.PlantoraData.loadPlants();
            const match = catalog.find(
              (p) =>
                p.name.toLowerCase() === (plantData.plantName || "").toLowerCase() ||
                p.scientificName?.toLowerCase() === (plantData.scientificName || "").toLowerCase()
            );
            if (match) catalogId = match.id;
          } catch (e) {}
        }

        // If logged in and Store available
        if (user && window.PlantoraStore && window.PlantoraStore.addPlantManually && catalogId) {
          await window.PlantoraStore.addPlantManually(catalogId, {
            nickname: plantData.plantName,
            location: "Living Room",
            wateringInterval: 7
          });
          showToast(`Added ${plantData.plantName} to My Plants!`);
        } else {
          // Save locally in local cache
          const localKey = "plantora_identified_plants";
          const saved = JSON.parse(localStorage.getItem(localKey) || "[]");
          saved.push({
            id: "id_" + Date.now(),
            name: plantData.plantName,
            scientificName: plantData.scientificName,
            healthStatus: plantData.healthStatus,
            diseaseName: plantData.diseaseName,
            dateAdded: new Date().toLocaleDateString(),
            image: this.selectedImageData?.dataUrl || ""
          });
          localStorage.setItem(localKey, JSON.stringify(saved));
          showToast(`Saved ${plantData.plantName} to your collection!`);
        }
      } catch (err) {
        console.warn("Could not save to backend:", err);
        showToast(`Saved ${plantData.plantName} to your local plant notes!`);
      }
    }

    updateKeyPill() {
      const keyPill = this.container.querySelector("#btn-open-key-settings");
      if (!keyPill) return;
      const dot = keyPill.querySelector(".identify-key-pill__dot");
      const label = keyPill.querySelector("#key-pill-label");
      const info = getKeySourceInfo();
      if (info.active) {
        if (dot) dot.className = "identify-key-pill__dot";
        if (label) label.textContent = "API Key Active";
        keyPill.title = `Gemini API Key configured via ${info.source}. Click to manage.`;
      } else {
        if (dot) dot.className = "identify-key-pill__dot identify-key-pill__dot--unset";
        if (label) label.textContent = "Set API Key";
        keyPill.title = "No Gemini API key set. Click to configure.";
      }
    }

    openApiKeyModal(onSavedCallback) {
      let modal = document.getElementById("identify-key-modal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "identify-key-modal";
        modal.className = "identify-modal-overlay";
        modal.innerHTML = `
          <div class="identify-modal-window" style="max-width: 520px;">
            <div class="identify-modal-header">
              <h3 style="font-size: 1.15rem;"><i data-lucide="key" style="color:var(--color-primary,#4caf68);width:20px;height:20px;"></i> Gemini API Key Settings</h3>
              <button type="button" class="modal-icon-btn" id="btn-close-key-modal" aria-label="Close modal">
                <i data-lucide="x" style="width:16px;height:16px;"></i>
              </button>
            </div>
            <div class="identify-modal-body" style="padding: 1.5rem;">
              <p style="margin-top: 0; color: var(--color-text-muted, #5c6355); font-size: 0.92rem; line-height: 1.5;">
                Plantora uses Google Gemini AI to analyze plant photos, detect diseases, and prescribe treatments.
              </p>
              
              <div id="key-modal-status-box" style="margin-bottom: 1.25rem; padding: 0.75rem 0.9rem; border-radius: 8px; font-size: 0.85rem; font-weight: 500; display: flex; align-items: center; gap: 8px;"></div>

              <div style="margin-bottom: 1.25rem;">
                <label for="input-gemini-key" style="display: block; font-weight: 600; font-size: 0.88rem; margin-bottom: 0.4rem; color: var(--color-primary-dark, #222);">
                  Google Gemini API Key
                </label>
                <div style="position: relative; display: flex; align-items: center;">
                  <input type="password" id="input-gemini-key" placeholder="AIzaSy... or AQ...." 
                    style="width: 100%; padding: 0.65rem 2.6rem 0.65rem 0.85rem; border: 1px solid var(--id-border, #d1d5db); border-radius: 8px; font-family: monospace; font-size: 0.88rem; box-sizing: border-box;" />
                  <button type="button" id="btn-toggle-key-visibility" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; color: #6b7280; padding: 4px;" title="Toggle key visibility">
                    <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                  </button>
                </div>
                <small style="display: block; margin-top: 0.45rem; color: #6b7280; font-size: 0.78rem;">
                  Keys entered here are saved safely in your browser (localStorage) and will never be committed or pushed to GitHub.
                </small>
              </div>

              <div style="display: flex; gap: 0.5rem; justify-content: flex-end; align-items: center; margin-top: 1.5rem;">
                <button type="button" class="btn btn--secondary" id="btn-modal-clear-key" style="font-size: 0.85rem; padding: 0.5rem 1rem;">
                  Clear Stored Key
                </button>
                <button type="button" class="btn btn--primary" id="btn-modal-save-key" style="font-size: 0.85rem; padding: 0.5rem 1.4rem;">
                  Save Key
                </button>
              </div>

              <div style="margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--id-border, #e5e7eb); font-size: 0.82rem; color: #6b7280; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <span>Don't have a key?</span>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary, #4caf68); text-decoration: underline; font-weight: 600;">
                  Get a free Gemini API key &nearr;
                </a>
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector("#btn-close-key-modal");
        const saveBtn = modal.querySelector("#btn-modal-save-key");
        const clearBtn = modal.querySelector("#btn-modal-clear-key");
        const toggleVisBtn = modal.querySelector("#btn-toggle-key-visibility");
        const inputKey = modal.querySelector("#input-gemini-key");

        const closeModal = () => {
          modal.classList.remove("is-open");
          document.body.style.overflow = "";
        };

        closeBtn.addEventListener("click", closeModal);
        modal.addEventListener("click", (e) => {
          if (e.target === modal) closeModal();
        });

        toggleVisBtn.addEventListener("click", () => {
          const isPass = inputKey.type === "password";
          inputKey.type = isPass ? "text" : "password";
          toggleVisBtn.innerHTML = `<i data-lucide="${isPass ? "eye-off" : "eye"}" style="width:16px;height:16px;"></i>`;
          if (window.PlantoraIcons && window.PlantoraIcons.refresh) window.PlantoraIcons.refresh();
        });

        saveBtn.addEventListener("click", () => {
          const val = inputKey.value.trim();
          if (!val) {
            alert("Please enter a valid Gemini API key or click Clear.");
            return;
          }
          setGeminiApiKey(val);
          this.updateKeyPill();
          showToast("Gemini API key saved successfully!");
          closeModal();
          if (typeof onSavedCallback === "function") {
            onSavedCallback();
          }
        });

        clearBtn.addEventListener("click", () => {
          setGeminiApiKey("");
          inputKey.value = "";
          this.updateKeyPill();
          showToast("Stored API key cleared.", "trash-2");
          refreshModalStatus();
        });
      }

      const input = modal.querySelector("#input-gemini-key");
      const statusBox = modal.querySelector("#key-modal-status-box");
      const currentKey = getGeminiApiKey();
      input.value = currentKey;

      const refreshModalStatus = () => {
        const info = getKeySourceInfo();
        if (info.active) {
          statusBox.style.backgroundColor = "#e8f5e9";
          statusBox.style.color = "#166534";
          statusBox.style.border = "1px solid #bbf7d0";
          statusBox.innerHTML = `
            <i data-lucide="check-circle-2" style="width:18px;height:18px;color:#16a34a;flex-shrink:0;"></i>
            <span>Key Active — Loaded from <strong>${info.source}</strong></span>
          `;
        } else {
          statusBox.style.backgroundColor = "#fef3c7";
          statusBox.style.color = "#92400e";
          statusBox.style.border = "1px solid #fde68a";
          statusBox.innerHTML = `
            <i data-lucide="alert-circle" style="width:18px;height:18px;color:#d97706;flex-shrink:0;"></i>
            <span>No API key active. Enter a key below or configure <code>script/config.js</code>.</span>
          `;
        }
        if (window.PlantoraIcons && window.PlantoraIcons.refresh) window.PlantoraIcons.refresh();
      };

      refreshModalStatus();
      modal.classList.add("is-open");
      document.body.style.overflow = "hidden";
      if (window.PlantoraIcons && window.PlantoraIcons.refresh) window.PlantoraIcons.refresh();
    }
  }

  // ===== Modal Support for Dashboard =====
  function setupIdentifyModal() {
    let overlay = document.getElementById("identify-modal-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "identify-modal-overlay";
      overlay.className = "identify-modal-overlay";
      overlay.innerHTML = `
        <div class="identify-modal-window" role="dialog" aria-modal="true" aria-labelledby="modal-identify-title">
          <div class="identify-modal-header">
            <h3 id="modal-identify-title">
              <i data-lucide="sparkles" style="color:var(--color-primary,#4caf68); width:20px; height:20px;"></i>
              Plant &amp; Disease Identification
            </h3>
            <div class="identify-modal-header__actions">
              <a href="identify.html" class="modal-icon-btn" title="Open Full Page View" aria-label="Open Full Page View">
                <i data-lucide="maximize-2" style="width:16px;height:16px;"></i>
              </a>
              <button type="button" class="modal-icon-btn" id="btn-close-identify-modal" title="Close" aria-label="Close">
                <i data-lucide="x" style="width:18px;height:18px;"></i>
              </button>
            </div>
          </div>
          <div class="identify-modal-body">
            <div id="modal-identify-mount"></div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const btnClose = overlay.querySelector("#btn-close-identify-modal");
      if (btnClose) {
        btnClose.addEventListener("click", () => closeIdentifyModal());
      }

      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeIdentifyModal();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("is-open")) {
          closeIdentifyModal();
        }
      });
    }

    const mount = overlay.querySelector("#modal-identify-mount");
    if (mount && !mount.__plantIdentifier) {
      mount.__plantIdentifier = new PlantIdentifier(mount, { isModal: true });
    }

    if (window.PlantoraIcons && window.PlantoraIcons.refresh) {
      window.PlantoraIcons.refresh();
    }
  }

  function openIdentifyModal() {
    setupIdentifyModal();
    const overlay = document.getElementById("identify-modal-overlay");
    if (overlay) {
      overlay.classList.add("is-open");
      document.body.style.overflow = "hidden";
    }
  }

  function closeIdentifyModal() {
    const overlay = document.getElementById("identify-modal-overlay");
    if (overlay) {
      overlay.classList.remove("is-open");
      document.body.style.overflow = "";

      const mount = overlay.querySelector("#modal-identify-mount");
      if (mount && mount.__plantIdentifier) {
        mount.__plantIdentifier.stopCameraStream();
      }
    }
  }

  // Expose API
  window.PlantoraIdentify = {
    init: (container, options) => new PlantIdentifier(container, options),
    openModal: openIdentifyModal,
    closeModal: closeIdentifyModal,
    showToast: showToast,
    getApiKey: getGeminiApiKey,
    setApiKey: setGeminiApiKey,
    getKeyInfo: getKeySourceInfo
  };

  // Auto-init on identify page if container is present
  document.addEventListener("DOMContentLoaded", () => {
    const pageMount = document.getElementById("identify-page-mount");
    if (pageMount) {
      new PlantIdentifier(pageMount, { isModal: false });
    }

    // Attach to any button with data-open-identify
    document.querySelectorAll("[data-open-identify]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        // If not already on identify.html, open modal or navigate
        if (!window.location.pathname.includes("identify.html")) {
          e.preventDefault();
          openIdentifyModal();
        }
      });
    });
  });
})();
