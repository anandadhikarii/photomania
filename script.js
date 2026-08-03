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
    const mobilePayBtn = document.getElementById('mobilePayBtn'); // Grabbed for deep-linking

    // Payment and dynamic mapping data - Updated to kondeti lokavardhan
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
            
            // Un-hide the entire payment wrapper (GPay, UTR, and Screenshot)
            if (paymentWrapper) paymentWrapper.classList.remove('d-none');
            
            // Dynamically populate GPay card layout details
            if (displayFee) displayFee.innerText = val + '.00';
            if (upiIdDisplay) upiIdDisplay.innerText = data.upi;
            if (gpayName) gpayName.innerText = data.name;
            if (gpayAvatar) {
                gpayAvatar.innerText = data.avatarText;
                gpayAvatar.style.backgroundColor = data.avatarBg;
            }
            
            // Build real, scannable deep-linked UPI string
            const upiString = `upi://pay?pa=${data.upi}&pn=${encodeURIComponent(data.name)}&am=${val}.00&cu=INR`;
            
            // Generate live QR image payload
            if (qrImage) qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;
            
            // Update Mobile Deep Link href
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
                // Pinpoint values using strict IDs (Bulletproof)
                const fullName = document.getElementById('regName').value.trim();
                const phone = document.getElementById('regPhone').value.trim();
                const email = document.getElementById('regEmail').value.trim();
                const college = document.getElementById('regCollege').value.trim();
                const year = document.getElementById('regYear').value;
                const branch = document.getElementById('regBranch').value;
                const utrNumber = document.getElementById('regUtr').value.trim();
                
                // Grab the file object
                const fileInput = document.getElementById('regScreenshot');
                const screenshotFile = fileInput.files[0];
                
                // Grab the selected radio button
                const selectedRadio = document.querySelector('input[name="eventCat"]:checked');
                
                // Final safety check
                if (!selectedRadio || !screenshotFile || !utrNumber) {
                    alert("Please select a package, enter your UTR, and attach a screenshot.");
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    return;
                }

                // 1. Upload to Cloudinary
                const CLOUD_NAME = "v1svygp1"; // Your integrated cloud name from dashboard
                const UPLOAD_PRESET = "photomania_preset"; // The unsigned preset you built
                
                const fileData = new FormData();
                fileData.append('file', screenshotFile);
                fileData.append('upload_preset', UPLOAD_PRESET);

                const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                    method: 'POST',
                    body: fileData
                });
                
                const imageJson = await cloudinaryResponse.json();
                if (!imageJson.secure_url) {
                    throw new Error("Image upload failed.");
                }
                
                // 2. Send payload to your Express Backend
                // IP Address updated for mobile testing (change back to deployed URL later)
                const dbResponse = await fetch('http://192.168.29.120:5000/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullName, phone, email, college, year, branch,
                        eventCat: Number(selectedRadio.value),
                        utrNumber, 
                        screenshotUrl: imageJson.secure_url
                    })
                });

                const apiResult = await dbResponse.json();

                if (dbResponse.status === 201) {
                    // Trigger Full-Screen Green Tick Animation
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
                console.error(err);
                alert("Network error. Please check your console logs.");
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});