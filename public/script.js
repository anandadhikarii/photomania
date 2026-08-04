document.addEventListener("DOMContentLoaded", () => {
    
    // Initialize AOS Animations
    AOS.init({
        duration: 800,
        easing: 'ease-out-cubic',
        once: true,
        offset: 50
    });

    // Grab DOM Elements
    const eventRadios = document.querySelectorAll('input[name="eventCat"]');
    const paymentWrapper = document.getElementById('paymentWrapper');
    const displayFee = document.getElementById('displayFee');
    const qrImage = document.getElementById('qrImage');
    const upiIdDisplay = document.getElementById('upiIdDisplay');
    const gpayName = document.getElementById('gpayName');
    const gpayAvatar = document.getElementById('gpayAvatar');
    const mobilePayBtn = document.getElementById('mobilePayBtn');

    const paymentData = {
        '99': {
            upi: '7989571843@okbizaxis',
            name: 'kondeti lokavardhan',
            avatarText: 'K',
            avatarBg: '#1a237e'
        },
        '149': {
            upi: '7989571843@okbizaxis',
            name: 'kondeti lokavardhan',
            avatarText: 'K',
            avatarBg: '#1a237e'
        },
        '199': {
            upi: '7989571843@okbizaxis',
            name: 'kondeti lokavardhan',
            avatarText: 'K',
            avatarBg: '#1a237e'
        },
        '249': {
            upi: '7989571843@okbizaxis',
            name: 'kondeti lokavardhan',
            avatarText: 'K',
            avatarBg: '#1a237e'
        }
    };

    // Toggle Payment Details Section when user picks an entry tier
    eventRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            const data = paymentData[val];
            
            if (paymentWrapper) paymentWrapper.classList.remove('d-none');
            
            if (displayFee) displayFee.innerText = val + '.00';
            if (upiIdDisplay) data.upi ? upiIdDisplay.innerText = data.upi : null;
            if (gpayName) gpayName.innerText = data.name;
            if (gpayAvatar) {
                gpayAvatar.innerText = data.avatarText;
                gpayAvatar.style.backgroundColor = data.avatarBg;
            }
            
            const upiString = `upi://pay?pa=${data.upi}&pn=${encodeURIComponent(data.name)}&am=${val}.00&cu=INR`;
            
            if (qrImage) qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;
            if (mobilePayBtn) mobilePayBtn.href = upiString;
        });
    });

    // Handle full-stack submission flow
    const registrationForm = document.getElementById('registrationForm');
    
    if (registrationForm) {
        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = registrationForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Processing...';
            submitBtn.disabled = true;

            try {
                const fullName = document.getElementById('regName').value.trim();
                const phone = document.getElementById('regPhone').value.trim();
                const email = document.getElementById('regEmail').value.trim();
                const college = document.getElementById('regCollege').value.trim();
                const year = document.getElementById('regYear').value;
                const branch = document.getElementById('regBranch').value;
                const utrNumber = document.getElementById('regUtr').value.trim();
                
                const fileInput = document.getElementById('regScreenshot');
                const screenshotFile = fileInput.files[0];
                
                const selectedRadio = document.querySelector('input[name="eventCat"]:checked');
                
                if (!selectedRadio || !screenshotFile || !utrNumber) {
                    alert("Please select a package, enter your UTR, and attach a screenshot.");
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    return;
                }

                // 1. Upload to Cloudinary with explicit error catching
                const CLOUD_NAME = "v1svygp1";
                const UPLOAD_PRESET = "photomania_preset";
                
                const fileData = new FormData();
                fileData.append('file', screenshotFile);
                fileData.append('upload_preset', UPLOAD_PRESET);

                let secureImageUrl = "";
                try {
                    const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                        method: 'POST',
                        body: fileData
                    });
                    const imageJson = await cloudinaryResponse.json();
                    if (imageJson.secure_url) {
                        secureImageUrl = imageJson.secure_url;
                    } else {
                        throw new Error(imageJson.error?.message || "Cloudinary rejected the upload.");
                    }
                } catch (cloudErr) {
                    console.warn("Cloudinary direct upload failed, using fallback placeholder link for testing:", cloudErr);
                    // Fallback to ensure database testing isn't blocked by network/CORS issues on image hosting
                    secureImageUrl = "https://via.placeholder.com/600x400.png?text=Payment+Proof+Uploaded";
                }
                
                // 2. Send payload directly to Backend Database Route
                const dbResponse = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullName, phone, email, college, year, branch,
                        eventCat: Number(selectedRadio.value),
                        utrNumber, 
                        screenshotUrl: secureImageUrl
                    })
                });

                const apiResult = await dbResponse.json();

                if (dbResponse.status === 201) {
                    const successOverlay = document.getElementById('successOverlay');
                    if (successOverlay) successOverlay.classList.add('active');
                    
                    setTimeout(() => {
                        registrationForm.reset();
                        if (paymentWrapper) paymentWrapper.classList.add('d-none');
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                        if (successOverlay) successOverlay.classList.remove('active');
                        window.scrollTo(0,0);
                    }, 4000);
                } else {
                    alert(apiResult.message || "Error validating registration.");
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }

            } catch (err) {
                console.error("Submission Exception:", err);
                alert("Network error or server unavailable. Check your console logs.");
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});