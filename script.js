/**
 * AI Social Media Caption Generator - Client-Side Logic
 * 
 * Features:
 * - Real-time textarea character counting & validation
 * - Quick prompt inspiration chips
 * - Server health check & API key status detection
 * - Async API integration with POST /api/generate-captions
 * - Single-card regeneration with POST /api/regenerate-caption
 * - Clipboard copy with visual checkmark and toast notifications
 * - Full button state management & error handling
 */

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------
  const form = document.getElementById('captionForm');
  const topicInput = document.getElementById('topicInput');
  const charCount = document.getElementById('charCount');
  const topicError = document.getElementById('topicError');
  const platformSelect = document.getElementById('platformSelect');
  const toneSelect = document.getElementById('toneSelect');
  const languageSelect = document.getElementById('languageSelect');
  const lengthSelect = document.getElementById('lengthSelect');
  const fontSelect = document.getElementById('fontSelect');
  const generateBtn = document.getElementById('generateBtn');
  const resetBtn = document.getElementById('resetBtn');
  const formErrorBanner = document.getElementById('formErrorBanner');
  const formErrorText = document.getElementById('formErrorText');

  // Multi-Page Views
  const viewGenerator = document.getElementById('viewGenerator');
  const viewResults = document.getElementById('viewResults');
  const btnBackToGenerator = document.getElementById('btnBackToGenerator');
  const btnNewCaption = document.getElementById('btnNewCaption');
  const btnEditInputs = document.getElementById('btnEditInputs');
  const btnBackBottom = document.getElementById('btnBackBottom');
  const btnNewCaptionBottom = document.getElementById('btnNewCaptionBottom');
  const emptyStateBackBtn = document.getElementById('emptyStateBackBtn');

  // Media Upload (Photo + Video) DOM Elements
  const dropZone = document.getElementById('dropZone');
  const imageInput = document.getElementById('imageInput');
  const dropZonePrompt = document.getElementById('dropZonePrompt');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const imagePreviewThumb = document.getElementById('imagePreviewThumb');
  const videoPreviewWrapper = document.getElementById('videoPreviewWrapper');
  const videoPreviewPlayer = document.getElementById('videoPreviewPlayer');
  const mediaTypeBadge = document.getElementById('mediaTypeBadge');
  const imageFileName = document.getElementById('imageFileName');
  const imageFileSize = document.getElementById('imageFileSize');
  const videoDurationBadge = document.getElementById('videoDurationBadge');
  const videoFrameBadge = document.getElementById('videoFrameBadge');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const topicRequiredStar = document.getElementById('topicRequiredStar');
  const topicLabelText = document.getElementById('topicLabelText');
  const imageStatusHint = document.getElementById('imageStatusHint');

  // Results Page Summary Sidebar DOM Elements
  const summaryMediaContainer = document.getElementById('summaryMediaContainer');
  const summaryVideoWrap = document.getElementById('summaryVideoWrap');
  const summaryVideoPlayer = document.getElementById('summaryVideoPlayer');
  const summaryImageWrap = document.getElementById('summaryImageWrap');
  const summaryImageThumb = document.getElementById('summaryImageThumb');
  const summaryEmptyMedia = document.getElementById('summaryEmptyMedia');
  const summaryPromptText = document.getElementById('summaryPromptText');
  const summaryPlatformBadge = document.getElementById('summaryPlatformBadge');
  const summaryToneBadge = document.getElementById('summaryToneBadge');
  const summaryLangBadge = document.getElementById('summaryLangBadge');
  const summaryLengthBadge = document.getElementById('summaryLengthBadge');
  const summaryFontBadge = document.getElementById('summaryFontBadge');
  const summaryHashBadge = document.getElementById('summaryHashBadge');

  // Generation Loading Overlay DOM Elements
  const generationOverlay = document.getElementById('generationOverlay');
  const generationStepText = document.getElementById('generationStepText');
  const stepItem1 = document.getElementById('stepItem1');
  const stepItem2 = document.getElementById('stepItem2');
  const stepItem3 = document.getElementById('stepItem3');

  // Token & $5 Credit Dashboard DOM Elements
  const remainingBalanceHero = document.getElementById('remainingBalanceHero');
  const remainingBalanceVal = document.getElementById('remainingBalanceVal');
  const balanceStatusHelper = document.getElementById('balanceStatusHelper');
  const totalCostVal = document.getElementById('totalCostVal');
  const balancePercentText = document.getElementById('balancePercentText');
  const balanceProgressFill = document.getElementById('balanceProgressFill');
  const totalTokensVal = document.getElementById('totalTokensVal');
  const totalTokensHelper = document.getElementById('totalTokensHelper');
  const inputTokensVal = document.getElementById('inputTokensVal');
  const outputTokensVal = document.getElementById('outputTokensVal');
  const lastRequestTokensVal = document.getElementById('lastRequestTokensVal');
  const lastRequestHelper = document.getElementById('lastRequestHelper');
  const tokenModelBadge = document.getElementById('tokenModelBadge');
  const resetTokensBtn = document.getElementById('resetTokensBtn');

  const emptyState = document.getElementById('emptyState');
  const captionCardsContainer = document.getElementById('captionCardsContainer');
  const resultsSubtitle = document.getElementById('resultsSubtitle');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const fontChipsBar = document.getElementById('fontChipsBar');

  const apiStatusBadge = document.getElementById('apiStatusBadge');
  const apiStatusText = document.getElementById('apiStatusText');
  const toastContainer = document.getElementById('toastContainer');
  const chipButtons = document.querySelectorAll('.chip-btn');

  // Application State
  let currentCaptions = [];
  let currentMedia = null; // { type: 'image'|'video', data: base64, mediaType: string, name: string, size: number, duration?: number, videoUrl?: string }
  let currentFontStyle = 'modern';
  let lastGenerationParams = null;
  let lastUsageData = null;
  let isGenerating = false;

  // Platform character limits for visual indicators
  const PLATFORM_LIMITS = {
    'X (Twitter)': { max: 280, ideal: 'Under 280 chars' },
    'Instagram': { max: 2200, ideal: '125-300 chars ideal' },
    'LinkedIn': { max: 3000, ideal: '150-500 chars ideal' },
    'Facebook': { max: 63206, ideal: '80-250 chars ideal' },
    'YouTube': { max: 5000, ideal: '150-350 chars ideal' }
  };

  // -------------------------------------------------------------
  // Token & $5 Credit Dashboard Update Helper
  // -------------------------------------------------------------
  function updateTokenDashboard(sessionUsage, lastUsage = null) {
    if (!sessionUsage) return;

    const startBalance = Number(sessionUsage.startingBalance !== undefined ? sessionUsage.startingBalance : 5.00);
    const spent = Number(sessionUsage.totalCost || 0);
    const remaining = Number(sessionUsage.remainingBalance !== undefined ? sessionUsage.remainingBalance : Math.max(0, startBalance - spent));
    const percentLeft = Math.max(0, Math.min(100, (remaining / startBalance) * 100));

    // Update Hero Balance & Spend
    if (remainingBalanceHero) {
      remainingBalanceHero.textContent = `$${remaining.toFixed(4)}`;
    }
    if (remainingBalanceVal) {
      remainingBalanceVal.textContent = `$${remaining.toFixed(4)}`;
      remainingBalanceVal.classList.remove('text-success', 'text-warning', 'text-danger');
      if (remaining <= 0.001) {
        remainingBalanceVal.classList.add('text-danger');
      } else if (remaining < 2.00) {
        remainingBalanceVal.classList.add('text-warning');
      } else {
        remainingBalanceVal.classList.add('text-success');
      }
    }

    if (totalCostVal) {
      totalCostVal.textContent = `$${spent.toFixed(4)}`;
    }

    if (balancePercentText) {
      balancePercentText.textContent = `${percentLeft.toFixed(1)}% Left`;
    }

    if (balanceProgressFill) {
      balanceProgressFill.style.width = `${percentLeft}%`;
      balanceProgressFill.classList.remove('warning', 'danger');
      if (percentLeft <= 15) {
        balanceProgressFill.classList.add('danger');
      } else if (percentLeft <= 45) {
        balanceProgressFill.classList.add('warning');
      }
    }

    if (balanceStatusHelper) {
      if (remaining <= 0.001) {
        balanceStatusHelper.textContent = '❌ Credit empty - click Reset to refill';
      } else if (remaining < 1.00) {
        balanceStatusHelper.textContent = '⚠️ Low credit warning';
      } else if (remaining < 4.999) {
        balanceStatusHelper.textContent = 'Active deduction from $5.00';
      } else {
        balanceStatusHelper.textContent = 'Full credit available';
      }
    }

    // Token totals
    const totTokens = sessionUsage.totalTokens || 0;
    if (totalTokensVal) {
      totalTokensVal.textContent = totTokens.toLocaleString();
    }
    if (totalTokensHelper) {
      totalTokensHelper.textContent = `${sessionUsage.totalRequests || 0} API ${sessionUsage.totalRequests === 1 ? 'call' : 'calls'} total`;
    }

    if (inputTokensVal) {
      inputTokensVal.textContent = (sessionUsage.totalInputTokens || 0).toLocaleString();
    }
    if (outputTokensVal) {
      outputTokensVal.textContent = (sessionUsage.totalOutputTokens || 0).toLocaleString();
    }

    // Last Request Cost & Tokens
    if (lastUsage) {
      const callCost = Number(lastUsage.cost !== undefined ? lastUsage.cost : (((lastUsage.inputTokens || 0) / 1e6 * 0.80) + ((lastUsage.outputTokens || 0) / 1e6 * 4.00)));
      if (lastRequestTokensVal) {
        lastRequestTokensVal.textContent = `-$${callCost.toFixed(4)}`;
      }
      if (lastRequestHelper) {
        lastRequestHelper.textContent = `+${(lastUsage.totalTokens || 0).toLocaleString()} tok (${lastUsage.inputTokens || 0} in • ${lastUsage.outputTokens || 0} out)`;
      }
    } else if (sessionUsage.lastRequest) {
      const callCost = Number(sessionUsage.lastRequest.cost || 0);
      if (lastRequestTokensVal) {
        lastRequestTokensVal.textContent = `-$${callCost.toFixed(4)}`;
      }
      if (lastRequestHelper) {
        lastRequestHelper.textContent = `+${(sessionUsage.lastRequest.totalTokens || 0).toLocaleString()} tok (${sessionUsage.lastRequest.inputTokens || 0} in • ${sessionUsage.lastRequest.outputTokens || 0} out)`;
      }
    } else {
      if (lastRequestTokensVal) {
        lastRequestTokensVal.textContent = '—';
      }
      if (lastRequestHelper) {
        lastRequestHelper.textContent = 'Awaiting generation';
      }
    }
  }

  // -------------------------------------------------------------
  // Initial Health Check
  // -------------------------------------------------------------
  async function checkServerHealth() {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('Health check failed');
      const data = await response.json();

      if (data.model && tokenModelBadge) {
        tokenModelBadge.textContent = `Model: ${data.model}`;
      }

      if (data.tokenStats) {
        updateTokenDashboard(data.tokenStats);
      }

      if (data.apiKeyConfigured) {
        apiStatusBadge.className = 'status-badge status-online';
        apiStatusText.textContent = 'API Ready';
        apiStatusBadge.title = `Connected to server. Using model: ${data.model}`;
      } else {
        apiStatusBadge.className = 'status-badge status-warning';
        apiStatusText.textContent = 'Key Missing in .env';
        apiStatusBadge.title = 'Add your ANTHROPIC_API_KEY into the .env file in the project root.';
      }
    } catch (err) {
      apiStatusBadge.className = 'status-badge status-error';
      apiStatusText.textContent = 'Server Offline';
      apiStatusBadge.title = 'Cannot connect to Express backend server.';
    }
  }

  // -------------------------------------------------------------
  // Mobile & Lab LAN Network Connectivity
  // -------------------------------------------------------------
  const btnMobileConnect = document.getElementById('btnMobileConnect');
  const footerMobileBtn = document.getElementById('footerMobileBtn');
  const mobileConnectModal = document.getElementById('mobileConnectModal');
  const btnCloseMobileModal = document.getElementById('btnCloseMobileModal');
  const networkUrlInput = document.getElementById('networkUrlInput');
  const localUrlInput = document.getElementById('localUrlInput');
  const btnCopyNetworkUrl = document.getElementById('btnCopyNetworkUrl');
  const btnCopyLocalUrl = document.getElementById('btnCopyLocalUrl');
  const networkQrImg = document.getElementById('networkQrImg');
  const qrLoadingSpinner = document.getElementById('qrLoadingSpinner');

  let cachedNetworkInfo = null;

  async function fetchNetworkInfo() {
    try {
      const res = await fetch('/api/network-info');
      if (res.ok) {
        cachedNetworkInfo = await res.json();
        if (cachedNetworkInfo && cachedNetworkInfo.networkUrl) {
          if (networkUrlInput) networkUrlInput.value = cachedNetworkInfo.networkUrl;
          if (localUrlInput) localUrlInput.value = cachedNetworkInfo.localUrl;
        }
      }
    } catch (e) {
      console.warn('Network info fetch error:', e);
    }
  }

  function openMobileConnectModal() {
    if (!mobileConnectModal) return;
    mobileConnectModal.style.display = 'flex';
    mobileConnectModal.setAttribute('aria-hidden', 'false');

    const port = window.location.port || '3000';
    let targetUrl = cachedNetworkInfo?.networkUrl;
    if (!targetUrl || targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
      const hostname = window.location.hostname;
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        targetUrl = `${window.location.protocol}//${hostname}:${port}`;
      } else if (cachedNetworkInfo?.localIp && cachedNetworkInfo.localIp !== 'localhost' && cachedNetworkInfo.localIp !== '127.0.0.1') {
        targetUrl = `http://${cachedNetworkInfo.localIp}:${port}`;
      } else {
        targetUrl = `http://${window.location.hostname}:${port}`;
      }
    }

    if (networkUrlInput) networkUrlInput.value = targetUrl;
    if (localUrlInput) localUrlInput.value = `http://localhost:${port}`;

    if (networkQrImg) {
      if (qrLoadingSpinner) qrLoadingSpinner.style.display = 'block';
      networkQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(targetUrl)}&bgcolor=14-0c-15&color=ef-44-44`;
      networkQrImg.onload = () => {
        if (qrLoadingSpinner) qrLoadingSpinner.style.display = 'none';
      };
      networkQrImg.onerror = () => {
        if (qrLoadingSpinner) qrLoadingSpinner.style.display = 'none';
      };
    }
  }

  function closeMobileConnectModal() {
    if (!mobileConnectModal) return;
    mobileConnectModal.style.display = 'none';
    mobileConnectModal.setAttribute('aria-hidden', 'true');
  }

  if (btnMobileConnect) {
    btnMobileConnect.addEventListener('click', openMobileConnectModal);
  }
  if (footerMobileBtn) {
    footerMobileBtn.addEventListener('click', openMobileConnectModal);
  }
  if (btnCloseMobileModal) {
    btnCloseMobileModal.addEventListener('click', closeMobileConnectModal);
  }
  if (mobileConnectModal) {
    mobileConnectModal.addEventListener('click', (e) => {
      if (e.target === mobileConnectModal) {
        closeMobileConnectModal();
      }
    });
  }

  if (btnCopyNetworkUrl && networkUrlInput) {
    btnCopyNetworkUrl.addEventListener('click', () => {
      copyToClipboard(networkUrlInput.value, btnCopyNetworkUrl);
      showToast('Network URL copied! Share with your mobile or lab PC.', 'success');
    });
  }

  if (btnCopyLocalUrl && localUrlInput) {
    btnCopyLocalUrl.addEventListener('click', () => {
      copyToClipboard(localUrlInput.value, btnCopyLocalUrl);
      showToast('Local URL copied!', 'success');
    });
  }

  // Reset Token Counters Event
  if (resetTokensBtn) {
    resetTokensBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/reset-token-usage', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
          updateTokenDashboard(data.tokenStats);
          if (lastRequestTokensVal) lastRequestTokensVal.textContent = '—';
          if (lastRequestHelper) lastRequestHelper.textContent = 'Counters reset';
          showToast('Token usage counters reset to 0.', 'info');
        }
      } catch (err) {
        console.error('Failed to reset token usage:', err);
      }
    });
  }

  // -------------------------------------------------------------
  // Toast Notification System
  // -------------------------------------------------------------
  function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '•'}</span>
      <span class="toast-msg">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Close notification">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      dismissToast(toast);
    });

    toastContainer.appendChild(toast);

    const timer = setTimeout(() => {
      dismissToast(toast);
    }, duration);

    toast.dataset.timerId = timer;
  }

  function dismissToast(toast) {
    if (!toast || toast.classList.contains('toast-hiding')) return;
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 250);
  }

  // -------------------------------------------------------------
  // Video & Photo Upload & Frame Extraction Handling
  // -------------------------------------------------------------
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg', 'video/x-m4v'];

  function handleMediaFile(file) {
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || ALLOWED_VIDEO_TYPES.includes(file.type) || /\.(mp4|webm|mov|m4v|ogg)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || ALLOWED_IMAGE_TYPES.includes(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(file.name);

    if (!isVideo && !isImage) {
      showToast('Please upload a valid photo (JPG, PNG, WEBP) or video (MP4, WEBM, MOV).', 'error');
      return;
    }

    const maxImageBytes = 10 * 1024 * 1024; // 10MB
    const maxVideoBytes = 50 * 1024 * 1024; // 50MB

    if (isImage && file.size > maxImageBytes) {
      showToast('Photo is too large. Please select an image under 10MB.', 'error');
      return;
    }

    if (isVideo && file.size > maxVideoBytes) {
      showToast('Video is too large. Please select a clip under 50MB.', 'error');
      return;
    }

    if (isVideo) {
      const videoBlobUrl = URL.createObjectURL(file);
      showToast('Loading video clip and capturing AI keyframe...', 'info', 2500);

      extractVideoKeyframe(file, (err, extracted) => {
        if (err || !extracted) {
          console.error('Frame extraction error:', err);
          showToast('Could not extract video keyframe. Please try another video clip.', 'error');
          return;
        }

        currentMedia = {
          type: 'video',
          data: extracted.data,
          mediaType: 'image/jpeg',
          isVideo: true,
          videoName: file.name,
          videoSize: file.size,
          videoDuration: extracted.duration,
          videoUrl: videoBlobUrl
        };

        // Update UI preview
        if (videoPreviewPlayer) {
          videoPreviewPlayer.src = videoBlobUrl;
        }
        if (videoPreviewWrapper) videoPreviewWrapper.style.display = 'flex';
        if (imagePreviewThumb) imagePreviewThumb.style.display = 'none';
        if (mediaTypeBadge) {
          mediaTypeBadge.textContent = '🎬 Video Reel';
        }
        if (imageFileName) imageFileName.textContent = file.name;
        if (imageFileSize) imageFileSize.textContent = formatFileSize(file.size);
        if (videoDurationBadge) {
          videoDurationBadge.style.display = 'inline';
          videoDurationBadge.textContent = `⏱️ ${extracted.duration}s`;
        }
        if (videoFrameBadge) {
          videoFrameBadge.style.display = 'inline';
        }

        dropZonePrompt.style.display = 'none';
        imagePreviewContainer.style.display = 'flex';
        dropZone.classList.add('has-image');

        if (topicRequiredStar) topicRequiredStar.style.display = 'none';
        if (topicLabelText) topicLabelText.textContent = 'Topic or Video Description (Optional with video)';
        topicInput.placeholder = 'Example: Describe what happens in the video, highlight moments, or background music vibe...';
        if (imageStatusHint) imageStatusHint.textContent = `Video attached (${extracted.duration}s clip) ✓`;
        clearError();
        showToast('Video clip ready! Claude AI will analyze the video scene.', 'success');
      });

    } else {
      // Photo Handling with automatic client-side resizing to optimize tokens and ensure dimensions stay under Anthropic 8000px limit
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawBase64 = e.target.result;
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          const maxDim = 1500;
          let finalBase64 = rawBase64;
          let finalMime = file.type || 'image/jpeg';

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
            try {
              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, w, h);
              finalBase64 = canvas.toDataURL('image/jpeg', 0.88);
              finalMime = 'image/jpeg';
            } catch (canvasErr) {
              console.warn('Canvas resize fallback to raw image:', canvasErr);
            }
          }

          currentMedia = {
            type: 'image',
            data: finalBase64,
            mediaType: finalMime,
            isVideo: false,
            name: file.name,
            size: file.size
          };

          if (imagePreviewThumb) {
            imagePreviewThumb.src = finalBase64;
            imagePreviewThumb.style.display = 'block';
          }
          if (videoPreviewWrapper) videoPreviewWrapper.style.display = 'none';
          if (videoPreviewPlayer) videoPreviewPlayer.src = '';
          if (mediaTypeBadge) {
            mediaTypeBadge.textContent = '📸 Photo';
          }
          if (imageFileName) imageFileName.textContent = file.name;
          if (imageFileSize) imageFileSize.textContent = formatFileSize(file.size);
          if (videoDurationBadge) videoDurationBadge.style.display = 'none';
          if (videoFrameBadge) videoFrameBadge.style.display = 'none';

          dropZonePrompt.style.display = 'none';
          imagePreviewContainer.style.display = 'flex';
          dropZone.classList.add('has-image');

          if (topicRequiredStar) topicRequiredStar.style.display = 'none';
          if (topicLabelText) topicLabelText.textContent = 'Topic or Context Notes (Optional with photo)';
          topicInput.placeholder = 'Example: Mention who was there, location, or thoughts (optional with photo)...';
          if (imageStatusHint) imageStatusHint.textContent = 'Photo attached ✓';
          clearError();
          showToast('Photo uploaded! Claude Vision is ready to analyze it.', 'info');
        };

        img.onerror = () => {
          showToast('Could not decode photo file. Please try another image.', 'error');
        };

        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    }
  }

  function extractVideoKeyframe(file, callback) {
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.muted = true;
    tempVideo.playsInline = true;
    const url = URL.createObjectURL(file);
    tempVideo.src = url;

    let hasSeeked = false;

    tempVideo.onloadeddata = () => {
      const dur = Math.round(tempVideo.duration || 0);
      const targetTime = Math.min(1.0, dur > 2 ? 1.0 : dur / 2);
      tempVideo.currentTime = targetTime;
    };

    tempVideo.onseeked = () => {
      if (hasSeeked) return;
      hasSeeked = true;
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 1280;
        let w = tempVideo.videoWidth || 640;
        let h = tempVideo.videoHeight || 360;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(tempVideo, 0, 0, w, h);
        const base64Data = canvas.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(url);
        callback(null, {
          data: base64Data,
          duration: Math.round(tempVideo.duration || 0)
        });
      } catch (err) {
        URL.revokeObjectURL(url);
        callback(err);
      }
    };

    tempVideo.onerror = () => {
      URL.revokeObjectURL(url);
      callback(new Error('Video read failed.'));
    };

    setTimeout(() => {
      if (!hasSeeked) {
        hasSeeked = true;
        URL.revokeObjectURL(url);
        callback(new Error('Video frame capture timed out.'));
      }
    }, 6000);
  }

  function removeMedia() {
    if (currentMedia && currentMedia.videoUrl) {
      try { URL.revokeObjectURL(currentMedia.videoUrl); } catch (e) {}
    }
    currentMedia = null;
    imageInput.value = '';
    if (imagePreviewThumb) {
      imagePreviewThumb.src = '';
      imagePreviewThumb.style.display = 'none';
    }
    if (videoPreviewPlayer) {
      videoPreviewPlayer.src = '';
    }
    if (videoPreviewWrapper) videoPreviewWrapper.style.display = 'none';
    if (videoDurationBadge) videoDurationBadge.style.display = 'none';
    if (videoFrameBadge) videoFrameBadge.style.display = 'none';

    imagePreviewContainer.style.display = 'none';
    dropZonePrompt.style.display = 'flex';
    dropZone.classList.remove('has-image');
    if (topicRequiredStar) topicRequiredStar.style.display = 'inline';
    if (topicLabelText) topicLabelText.textContent = 'Topic or Video Description';
    topicInput.placeholder = 'Example: Epic match victory celebration with friends, high energy stadium vibes, confetti falling...';
    if (imageStatusHint) imageStatusHint.textContent = 'Optional photo or video clip';
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // DropZone Click & Keyboard Events
  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('#removeImageBtn')) return;
    imageInput.click();
  });

  dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      imageInput.click();
    }
  });

  imageInput.addEventListener('change', () => {
    if (imageInput.files && imageInput.files[0]) {
      handleMediaFile(imageInput.files[0]);
    }
  });

  removeImageBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeMedia();
  });

  // Drag and Drop Events
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files[0]) {
      handleMediaFile(dt.files[0]);
    }
  });

  // -------------------------------------------------------------
  // Form Helpers & Validation
  // -------------------------------------------------------------
  function updateCharCount() {
    const len = topicInput.value.length;
    charCount.textContent = `${len} / 500`;

    if (len >= 480) {
      charCount.className = 'char-count at-limit';
    } else if (len >= 400) {
      charCount.className = 'char-count near-limit';
    } else {
      charCount.className = 'char-count';
    }
  }

  function clearError() {
    topicError.textContent = '';
    formErrorBanner.style.display = 'none';
    formErrorText.textContent = '';
  }

  function showError(msg) {
    formErrorBanner.style.display = 'flex';
    formErrorText.textContent = msg;
    showToast(msg, 'error', 5000);
  }

  function validateForm() {
    clearError();
    const topic = topicInput.value.trim();
    const hasMedia = Boolean(currentMedia && currentMedia.data);

    if (!topic && !hasMedia) {
      topicError.textContent = 'Please enter a description or upload a photo or video.';
      showError('Please enter a description or upload a photo or video.');
      topicInput.focus();
      return false;
    }

    if (topic && topic.length < 3 && !hasMedia) {
      topicError.textContent = 'Topic is too short. Please write at least 3 characters.';
      showError('Topic is too short. Please write at least 3 characters.');
      topicInput.focus();
      return false;
    }

    if (topic.length > 500) {
      topicError.textContent = 'Topic exceeds the 500 character limit.';
      showError('Topic exceeds the 500 character limit.');
      topicInput.focus();
      return false;
    }

    return true;
  }

  // Textarea input event for live character count
  topicInput.addEventListener('input', () => {
    updateCharCount();
    if (topicError.textContent) {
      topicError.textContent = '';
      formErrorBanner.style.display = 'none';
    }
  });

  // Quick Inspiration Chips
  chipButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      if (prompt) {
        topicInput.value = prompt;
        updateCharCount();
        clearError();
        topicInput.focus();
      }
    });
  });

  // Reset Button
  resetBtn.addEventListener('click', () => {
    form.reset();
    removeMedia();
    setCaptionFontStyle('modern', false);
    updateCharCount();
    clearError();
    topicInput.focus();
  });

  // -------------------------------------------------------------
  // Clipboard Copy Helpers
  // -------------------------------------------------------------
  async function copyToClipboard(text, buttonElement = null) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = text;
        tempTextArea.style.position = 'fixed';
        tempTextArea.style.left = '-9999px';
        document.body.appendChild(tempTextArea);
        tempTextArea.focus();
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);
      }

      if (buttonElement) {
        const originalContent = buttonElement.innerHTML;
        buttonElement.classList.add('copied');
        buttonElement.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Copied!
        `;
        setTimeout(() => {
          buttonElement.classList.remove('copied');
          buttonElement.innerHTML = originalContent;
        }, 2000);
      }

      showToast('Caption copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      showToast('Could not copy to clipboard. Please copy manually.', 'error');
    }
  }

  // -------------------------------------------------------------
  // Multi-Page SPA Navigation: Generator (Page 1) vs Results (Page 2)
  // -------------------------------------------------------------
  function showView(viewName) {
    if (viewName === 'results') {
      if (viewGenerator) {
        viewGenerator.style.display = 'none';
        viewGenerator.classList.remove('active-view');
      }
      if (viewResults) {
        viewResults.style.display = 'block';
        viewResults.classList.add('active-view');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      try {
        history.pushState({ view: 'results' }, '', '#/results');
      } catch (e) {}
    } else {
      if (viewResults) {
        viewResults.style.display = 'none';
        viewResults.classList.remove('active-view');
      }
      if (viewGenerator) {
        viewGenerator.style.display = 'block';
        viewGenerator.classList.add('active-view');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      try {
        history.pushState({ view: 'generator' }, '', '#/');
      } catch (e) {}
    }
  }

  // Handle browser back and forward history buttons
  window.addEventListener('popstate', () => {
    const hash = window.location.hash;
    if (hash === '#/results' && currentCaptions && currentCaptions.length > 0) {
      if (viewGenerator) {
        viewGenerator.style.display = 'none';
        viewGenerator.classList.remove('active-view');
      }
      if (viewResults) {
        viewResults.style.display = 'block';
        viewResults.classList.add('active-view');
      }
    } else {
      if (viewResults) {
        viewResults.style.display = 'none';
        viewResults.classList.remove('active-view');
      }
      if (viewGenerator) {
        viewGenerator.style.display = 'block';
        viewGenerator.classList.add('active-view');
      }
    }
  });

  // -------------------------------------------------------------
  // Typography and Font Selection Options
  // -------------------------------------------------------------
  const FONT_INFO = {
    'modern': { label: 'Modern Clean', className: 'font-modern', isUnicode: false },
    'bold-impact': { label: 'Bold Impact', className: 'font-bold-impact', isUnicode: false },
    'elegant': { label: 'Elegant Serif', className: 'font-elegant', isUnicode: false },
    'cyber-mono': { label: 'Cyber Mono', className: 'font-cyber-mono', isUnicode: false },
    'handwritten': { label: 'Handwritten', className: 'font-handwritten', isUnicode: false },
    'unicode-bold': { label: 'Social Media 𝗕𝗼𝗹𝗱', className: 'font-unicode-bold', isUnicode: true },
    'unicode-italic': { label: 'Social Media 𝘐𝘵𝘢𝘭𝘪𝘤', className: 'font-unicode-italic', isUnicode: true },
    'unicode-script': { label: 'Social Media 𝓒𝓾𝓻𝓼𝓲𝓿𝓮', className: 'font-unicode-script', isUnicode: true }
  };

  /**
   * Applies social media Unicode styling directly to Latin text for copying into Instagram/X/LinkedIn
   */
  function applyFontStyleToText(text, fontStyle) {
    if (!text || !fontStyle) return text;
    if (fontStyle === 'unicode-bold') {
      return text.replace(/[A-Za-z0-9]/g, (char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + (code - 65)); // Sans bold A-Z
        if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + (code - 97)); // Sans bold a-z
        if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7EC + (code - 48)); // Sans bold 0-9
        return char;
      });
    }
    if (fontStyle === 'unicode-italic') {
      return text.replace(/[A-Za-z]/g, (char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D608 + (code - 65)); // Sans italic A-Z
        if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D622 + (code - 97)); // Sans italic a-z
        return char;
      });
    }
    if (fontStyle === 'unicode-script') {
      return text.replace(/[A-Za-z]/g, (char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D4D0 + (code - 65)); // Bold script A-Z
        if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D4EA + (code - 97)); // Bold script a-z
        return char;
      });
    }
    return text;
  }

  /**
   * Sets active font style, synchronizes dropdown and chips, and re-renders captions if live
   */
  function setCaptionFontStyle(newFont, triggerRerender = true) {
    if (!FONT_INFO[newFont]) newFont = 'modern';
    currentFontStyle = newFont;

    if (fontSelect && fontSelect.value !== newFont) {
      fontSelect.value = newFont;
    }

    if (fontChipsBar) {
      fontChipsBar.querySelectorAll('.font-chip-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-font') === newFont);
      });
    }

    if (summaryFontBadge) {
      const fInfo = FONT_INFO[newFont] || { label: 'Modern Clean' };
      summaryFontBadge.textContent = `🔤 ${fInfo.label}`;
    }

    if (triggerRerender && currentCaptions && currentCaptions.length > 0 && lastGenerationParams) {
      renderCaptions(
        currentCaptions,
        lastGenerationParams.platform,
        lastGenerationParams.tone,
        lastGenerationParams.language,
        lastUsageData
      );
    }
  }

  // -------------------------------------------------------------
  // Results Page (Next Page) Summary Sidebar
  // -------------------------------------------------------------
  function updateResultsSummary(params) {
    if (summaryPromptText) {
      summaryPromptText.textContent = params.topic || '(Analyzed visually from uploaded media)';
    }
    if (summaryPlatformBadge) summaryPlatformBadge.textContent = params.platform;
    if (summaryToneBadge) summaryToneBadge.textContent = params.tone;
    if (summaryLangBadge) summaryLangBadge.textContent = params.language;
    if (summaryLengthBadge) summaryLengthBadge.textContent = params.length;
    if (summaryFontBadge) {
      const fInfo = FONT_INFO[currentFontStyle] || { label: 'Modern Clean' };
      summaryFontBadge.textContent = `🔤 ${fInfo.label}`;
    }
    if (summaryHashBadge) summaryHashBadge.textContent = params.includeHashtags ? '# With Hashtags' : '✕ No Hashtags';

    if (currentMedia && currentMedia.type === 'video' && currentMedia.videoUrl) {
      if (summaryVideoPlayer) {
        summaryVideoPlayer.src = currentMedia.videoUrl;
      }
      if (summaryVideoWrap) summaryVideoWrap.style.display = 'flex';
      if (summaryImageWrap) summaryImageWrap.style.display = 'none';
      if (summaryEmptyMedia) summaryEmptyMedia.style.display = 'none';
    } else if (currentMedia && currentMedia.data) {
      if (summaryImageThumb) {
        summaryImageThumb.src = currentMedia.data;
      }
      if (summaryImageWrap) summaryImageWrap.style.display = 'flex';
      if (summaryVideoWrap) summaryVideoWrap.style.display = 'none';
      if (summaryEmptyMedia) summaryEmptyMedia.style.display = 'none';
    } else {
      if (summaryVideoWrap) summaryVideoWrap.style.display = 'none';
      if (summaryImageWrap) summaryImageWrap.style.display = 'none';
      if (summaryEmptyMedia) summaryEmptyMedia.style.display = 'flex';
    }
  }

  // -------------------------------------------------------------
  // Render Caption Cards (on Next Page)
  // -------------------------------------------------------------
  function renderCaptions(captions, platform, tone, language, usage = null) {
    currentCaptions = captions;
    if (usage !== undefined && usage !== null) {
      lastUsageData = usage;
    }
    captionCardsContainer.innerHTML = '';

    const platformInfo = PLATFORM_LIMITS[platform] || { max: 1000, ideal: 'Standard' };
    const fontInfo = FONT_INFO[currentFontStyle] || { className: 'font-modern', isUnicode: false };
    const isUnicode = Boolean(fontInfo.isUnicode);

    captions.forEach((cap, index) => {
      const card = document.createElement('article');
      card.className = 'caption-card';
      card.id = `captionCard-${cap.id || index + 1}`;

      const styledCaptionText = isUnicode ? applyFontStyleToText(cap.text, currentFontStyle) : cap.text;

      const hashtagsString = (cap.hashtags && cap.hashtags.length > 0)
        ? '\n\n' + cap.hashtags.join(' ')
        : '';
      const fullTextToCopy = styledCaptionText + hashtagsString;
      const totalCharLength = fullTextToCopy.length;

      const limitBadge = (platform === 'X (Twitter)' && totalCharLength > 280)
        ? `<span class="platform-guide" style="color: #ef4444;">⚠️ ${totalCharLength}/280 limit</span>`
        : `<span class="platform-guide">${totalCharLength} chars • ${platformInfo.ideal}</span>`;

      // Token and cost pill for this generation
      const costText = (usage && usage.cost !== undefined)
        ? ` • -$${Number(usage.cost).toFixed(4)}`
        : '';
      const tokenPill = (usage && usage.totalTokens)
        ? `<span class="card-token-pill" title="Tokens and cost consumed by this Claude API call">⚡ ${usage.totalTokens} tokens${costText}</span>`
        : '';

      let hashtagsHtml = '';
      if (cap.hashtags && cap.hashtags.length > 0) {
        hashtagsHtml = `
          <div class="caption-hashtags" aria-label="Suggested hashtags">
            ${cap.hashtags.map(tag => `<span class="hashtag-tag" title="Click to copy tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="caption-card-header">
          <div class="caption-badge-group">
            <span class="caption-option-pill">Option ${cap.id || index + 1}</span>
            <span class="caption-style-title">${escapeHtml(cap.title || 'Creative Option')}</span>
          </div>
          <span class="feat-tag">${escapeHtml(platform)} • ${escapeHtml(tone)}</span>
        </div>

        <div class="caption-body ${fontInfo.className}">${escapeHtml(styledCaptionText)}</div>

        ${hashtagsHtml}

        <div class="caption-card-footer">
          <div class="char-indicator">
            ${limitBadge}
            ${tokenPill}
          </div>
          <div class="card-actions-group">
            <button type="button" class="btn-card-action btn-regenerate" data-card-id="${cap.id || index + 1}" title="Regenerate this specific caption option">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              Regenerate
            </button>
            <button type="button" class="btn-card-action btn-copy-card" data-copy-target="${cap.id || index + 1}" title="Copy complete caption and hashtags">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy Caption
            </button>
          </div>
        </div>
      `;

      // Event: Copy Caption
      const copyBtn = card.querySelector('.btn-copy-card');
      copyBtn.addEventListener('click', () => {
        copyToClipboard(fullTextToCopy, copyBtn);
      });

      // Event: Click hashtag to copy single tag
      const tagElements = card.querySelectorAll('.hashtag-tag');
      tagElements.forEach(tagEl => {
        tagEl.addEventListener('click', (e) => {
          e.stopPropagation();
          copyToClipboard(tagEl.textContent);
        });
      });

      // Event: Regenerate single card
      const regenBtn = card.querySelector('.btn-regenerate');
      regenBtn.addEventListener('click', () => {
        regenerateSingleCaption(cap.id || index + 1, cap.text, card);
      });

      captionCardsContainer.appendChild(card);
    });

    if (resultsSubtitle) {
      resultsSubtitle.textContent = `Generated 3 options for ${platform} in ${language}.`;
    }
    if (emptyState) emptyState.style.display = 'none';
  }

  // -------------------------------------------------------------
  // Single Card Regeneration
  // -------------------------------------------------------------
  async function regenerateSingleCaption(cardId, previousCaptionText, cardElement) {
    if (isGenerating) return;

    const topic = topicInput.value.trim();
    const platform = platformSelect.value;
    const tone = toneSelect.value;
    const language = languageSelect.value;
    const length = lengthSelect.value;
    const includeHashtags = form.querySelector('input[name="includeHashtags"]:checked').value === 'true';

    const regenBtn = cardElement.querySelector('.btn-regenerate');
    const originalBtnText = regenBtn.innerHTML;

    try {
      cardElement.classList.add('is-regenerating');
      regenBtn.disabled = true;
      regenBtn.innerHTML = `
        <span class="btn-spinner" style="display:inline-block; width:12px; height:12px; margin-right:4px;" aria-hidden="true"></span>
        Regenerating...
      `;

      const response = await fetch('/api/regenerate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          image: currentMedia ? {
            data: currentMedia.data,
            mediaType: currentMedia.mediaType,
            isVideo: Boolean(currentMedia.isVideo),
            videoName: currentMedia.videoName,
            videoDuration: currentMedia.videoDuration
          } : null,
          platform,
          tone,
          language,
          length,
          includeHashtags,
          cardId,
          previousCaptionText
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to regenerate caption.');
      }

      // Update in local state
      const updatedIndex = currentCaptions.findIndex(c => (c.id || 1) === Number(cardId));
      if (updatedIndex !== -1) {
        currentCaptions[updatedIndex] = data.caption;
      }

      // Update token stats dashboard
      if (data.sessionUsage) {
        updateTokenDashboard(data.sessionUsage, data.usage);
      }

      // Re-render all cards with updated item
      renderCaptions(currentCaptions, platform, tone, language, data.usage);
      const regenCostStr = (data.usage?.cost !== undefined) ? ` • -$${Number(data.usage.cost).toFixed(4)}` : '';
      showToast(`Option ${cardId} refreshed! (+${data.usage?.totalTokens || 0} tokens${regenCostStr})`, 'success');

    } catch (err) {
      console.error('Regeneration error:', err);
      showToast(err.message, 'error', 5000);
    } finally {
      cardElement.classList.remove('is-regenerating');
      regenBtn.disabled = false;
      regenBtn.innerHTML = originalBtnText;
    }
  }

  // -------------------------------------------------------------
  // Form Submission: Generate 3 Captions (Go to Next Page)
  // -------------------------------------------------------------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isGenerating) return;
    if (!validateForm()) return;

    const topic = topicInput.value.trim();
    const platform = platformSelect.value;
    const tone = toneSelect.value;
    const language = languageSelect.value;
    const length = lengthSelect.value;
    const fontStyle = (fontSelect ? fontSelect.value : 'modern') || 'modern';
    const includeHashtags = form.querySelector('input[name="includeHashtags"]:checked').value === 'true';

    setCaptionFontStyle(fontStyle, false);

    lastGenerationParams = { topic, platform, tone, language, length, fontStyle, includeHashtags };

    // UI Loading State
    isGenerating = true;
    generateBtn.disabled = true;
    generateBtn.classList.add('loading');
    clearError();

    // Show Fullscreen Animated Loading Screen
    if (generationOverlay) {
      generationOverlay.style.display = 'flex';
      if (generationStepText) {
        generationStepText.textContent = currentMedia?.type === 'video'
          ? 'Analyzing video keyframe & audience context...'
          : 'Analyzing photo visuals & audience context...';
      }
      if (stepItem1) stepItem1.className = 'gen-step-item active';
      if (stepItem2) stepItem2.className = 'gen-step-item';
      if (stepItem3) stepItem3.className = 'gen-step-item';
    }

    const stepTimer = setTimeout(() => {
      if (stepItem1) stepItem1.className = 'gen-step-item completed';
      if (stepItem2) stepItem2.className = 'gen-step-item active';
      if (generationStepText) {
        generationStepText.textContent = `Crafting 3 viral hooks for ${platform} (${tone} tone)...`;
      }
    }, 1200);

    try {
      const response = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          topic,
          image: currentMedia ? {
            data: currentMedia.data,
            mediaType: currentMedia.mediaType,
            isVideo: Boolean(currentMedia.isVideo),
            videoName: currentMedia.videoName,
            videoDuration: currentMedia.videoDuration
          } : null,
          platform,
          tone,
          language,
          length,
          includeHashtags
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate captions. Please try again.');
      }

      clearTimeout(stepTimer);
      if (stepItem2) stepItem2.className = 'gen-step-item completed';
      if (stepItem3) stepItem3.className = 'gen-step-item active';
      if (generationStepText) {
        generationStepText.textContent = 'Deducting token cost & opening Next Page...';
      }

      // Update token stats dashboard
      if (data.sessionUsage) {
        updateTokenDashboard(data.sessionUsage, data.usage);
      }

      // Populate summary on Next Page & Render Cards
      updateResultsSummary(lastGenerationParams);
      renderCaptions(data.captions, platform, tone, language, data.usage);

      setTimeout(() => {
        if (generationOverlay) generationOverlay.style.display = 'none';
        showView('results'); // Switch to Page 2!
        const callCostStr = (data.usage?.cost !== undefined) ? ` • -$${Number(data.usage.cost).toFixed(4)}` : '';
        showToast(`3 captions generated on Next Page! (+${data.usage?.totalTokens || 0} tokens${callCostStr})`, 'success');
      }, 450);

    } catch (err) {
      clearTimeout(stepTimer);
      console.error('Generation request failed:', err);
      if (generationOverlay) generationOverlay.style.display = 'none';
      showError(err.message);
    } finally {
      isGenerating = false;
      generateBtn.disabled = false;
      generateBtn.classList.remove('loading');
    }
  });

  // -------------------------------------------------------------
  // Navigation & Action Buttons Wiring
  // -------------------------------------------------------------
  if (btnBackToGenerator) {
    btnBackToGenerator.addEventListener('click', () => showView('generator'));
  }

  if (btnEditInputs) {
    btnEditInputs.addEventListener('click', () => showView('generator'));
  }

  if (btnBackBottom) {
    btnBackBottom.addEventListener('click', () => showView('generator'));
  }

  if (emptyStateBackBtn) {
    emptyStateBackBtn.addEventListener('click', () => showView('generator'));
  }

  function resetAllAndStartFresh() {
    form.reset();
    removeMedia();
    setCaptionFontStyle('modern', false);
    updateCharCount();
    clearError();
    showView('generator');
    topicInput.focus();
    showToast('Ready for your next post!', 'info');
  }

  if (btnNewCaption) {
    btnNewCaption.addEventListener('click', resetAllAndStartFresh);
  }

  if (btnNewCaptionBottom) {
    btnNewCaptionBottom.addEventListener('click', resetAllAndStartFresh);
  }

  // Copy All Captions Button
  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', () => {
      if (!currentCaptions || currentCaptions.length === 0) return;

      const fontInfo = FONT_INFO[currentFontStyle] || { isUnicode: false };
      const isUnicode = Boolean(fontInfo.isUnicode);

      const allFormattedText = currentCaptions.map((cap, i) => {
        const styledText = isUnicode ? applyFontStyleToText(cap.text, currentFontStyle) : cap.text;
        const tags = (cap.hashtags && cap.hashtags.length > 0) ? `\n${cap.hashtags.join(' ')}` : '';
        return `--- Option ${cap.id || i + 1} (${cap.title || 'Style'}) ---\n${styledText}${tags}\n`;
      }).join('\n');

      copyToClipboard(allFormattedText, copyAllBtn);
    });
  }

  // -------------------------------------------------------------
  // Utility: HTML Escaping to prevent XSS
  // -------------------------------------------------------------
  function escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
  }

  // -------------------------------------------------------------
  // Reset Tokens & Credit Balance Button
  // -------------------------------------------------------------
  if (resetTokensBtn) {
    resetTokensBtn.addEventListener('click', async () => {
      try {
        resetTokensBtn.disabled = true;
        resetTokensBtn.innerHTML = 'Refilling...';

        const response = await fetch('/api/reset-token-usage', {
          method: 'POST'
        });
        const data = await response.json();

        if (data.success && data.tokenStats) {
          updateTokenDashboard(data.tokenStats);
          showToast('Credit balance reset back to $5.0000 successfully!', 'success');
        } else {
          showToast('Failed to reset credit balance.', 'error');
        }
      } catch (err) {
        console.error('Reset credit error:', err);
        showToast('Server error while resetting balance.', 'error');
      } finally {
        resetTokensBtn.disabled = false;
        resetTokensBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
          Reset to $5.00`;
      }
    });
  }

  // Font Style Listeners
  if (fontSelect) {
    fontSelect.addEventListener('change', () => {
      setCaptionFontStyle(fontSelect.value, true);
    });
  }

  if (fontChipsBar) {
    fontChipsBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.font-chip-btn');
      if (btn && btn.getAttribute('data-font')) {
        const selectedFont = btn.getAttribute('data-font');
        setCaptionFontStyle(selectedFont, true);
        const fInfo = FONT_INFO[selectedFont] || { label: selectedFont };
        showToast(`Typography switched to ${fInfo.label}`, 'info', 2000);
      }
    });
  }

  // Initial Run
  updateCharCount();
  checkServerHealth();
  fetchNetworkInfo();
});

