document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const photoInput = document.getElementById('photo');
    const imagePreview = document.getElementById('image-preview');
    const previewContainer = document.getElementById('image-preview-container');
    const cropButton = document.getElementById('crop-button');
    const recropButton = document.getElementById('recrop-button');
    const croppedDataInput = document.getElementById('cropped-data');
    const cropImage = document.getElementById('crop-image');
    const cropperModal = new bootstrap.Modal(document.getElementById('cropperModal'));
    
    let cropper;
    
    // Initialize file input change event
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const files = e.target.files;
            if (files && files.length > 0) {
                const file = files[0];
                
                // Check file size (5MB max)
                if (file.size > 5 * 1024 * 1024) {
                    alert('File is too large. Maximum size is 5MB.');
                    photoInput.value = '';
                    return;
                }
                
                // Check if file is an image
                if (!file.type.match('image.*')) {
                    alert('Please select an image file.');
                    photoInput.value = '';
                    return;
                }
                
                // Read the file and show in modal
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Set the src of the image in the modal
                    cropImage.src = e.target.result;
                    
                    // Open the modal
                    cropperModal.show();
                    
                    // Initialize cropper after modal is shown
                    setTimeout(() => {
                        if (cropper) {
                            cropper.destroy();
                        }
                        
                        cropper = new Cropper(cropImage, {
                            aspectRatio: 1,
                            viewMode: 1,
                            guides: true,
                            center: true,
                            highlight: false,
                            cropBoxResizable: true,
                            dragMode: 'move',
                            toggleDragModeOnDblclick: false,
                            autoCropArea: 0.8,
                            responsive: true,
                            minContainerWidth: 200,
                            minContainerHeight: 200,
                            // Make crop box round
                            ready: function() {
                                // Add a class to make the crop box round
                                const cropBoxContainer = document.querySelector('.cropper-view-box');
                                if (cropBoxContainer) {
                                    cropBoxContainer.style.borderRadius = '50%';
                                    document.querySelector('.cropper-face').style.borderRadius = '50%';
                                }
                            }
                        });
                    }, 500);
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Crop button click event
    if (cropButton) {
        cropButton.addEventListener('click', function() {
            if (!cropper) return;
            
            // Get cropped canvas
            const canvas = cropper.getCroppedCanvas({
                width: 300,
                height: 300,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });
            
            if (canvas) {
                // Convert canvas to data URL
                const croppedImageData = canvas.toDataURL('image/png');
                
                // Set preview image
                imagePreview.src = croppedImageData;
                imagePreview.style.display = 'block';
                recropButton.style.display = 'block';
                
                // Set the value of the hidden input
                croppedDataInput.value = croppedImageData;
                
                // Close the modal
                cropperModal.hide();
                
                // Destroy cropper
                cropper.destroy();
                cropper = null;
            }
        });
    }
    
    // Re-crop button click event
    if (recropButton) {
        recropButton.addEventListener('click', function() {
            // Trigger the file input click to re-select an image
            // or reopen the cropper with the existing image
            if (imagePreview.src) {
                cropImage.src = imagePreview.src;
                cropperModal.show();
                
                // Initialize cropper after modal is shown
                setTimeout(() => {
                    if (cropper) {
                        cropper.destroy();
                    }
                    
                    cropper = new Cropper(cropImage, {
                        aspectRatio: 1,
                        viewMode: 1,
                        guides: true,
                        center: true,
                        highlight: false,
                        cropBoxResizable: true,
                        dragMode: 'move',
                        toggleDragModeOnDblclick: false,
                        autoCropArea: 0.8,
                        responsive: true,
                        minContainerWidth: 200,
                        minContainerHeight: 200,
                        // Make crop box round
                        ready: function() {
                            // Add a class to make the crop box round
                            const cropBoxContainer = document.querySelector('.cropper-view-box');
                            if (cropBoxContainer) {
                                cropBoxContainer.style.borderRadius = '50%';
                                document.querySelector('.cropper-face').style.borderRadius = '50%';
                            }
                        }
                    });
                }, 500);
            }
        });
    }
    
    // Copy share link to clipboard
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const shareLink = document.getElementById('share-link');
    
    if (copyLinkBtn && shareLink) {
        copyLinkBtn.addEventListener('click', function () {
            navigator.clipboard.writeText(shareLink.value)
                .then(() => {
                    // Change button text temporarily
                    const originalText = this.innerHTML;
                    this.innerHTML = '<i class="fas fa-check"></i> Copied!';
    
                    setTimeout(() => {
                        this.innerHTML = originalText;
                    }, 2000);
                })
                .catch(err => {
                    console.error('Failed to copy text: ', err);
                });
        });
    }
    
    // Download poster functionality
    const downloadBtn = document.getElementById('download-poster-btn');
    
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const posterImage = document.querySelector('.poster-image');
            if (posterImage) {
                const posterUrl = posterImage.getAttribute('src');
                
                // Create temporary anchor element
                const tempLink = document.createElement('a');
                tempLink.href = posterUrl;
                tempLink.download = 'my-invitation-poster.png';
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);
            }
        });
    }

});