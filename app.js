import { Amplify, Auth } from 'aws-amplify';
import { Authenticator, withAuthenticator } from '@aws-amplify/ui-react'; // Using the React wrapper for better event handling
import '@aws-amplify/ui-react/styles.css';

// --- Configuration ---
const awsconfig = {
    "aws_project_region": "us-east-1", // Your API Gateway is in us-east-1
    "aws_cognito_region": "ap-northeast-1",
    "aws_user_pools_id": "ap-northeast-1_FySpl0LW5",
    "aws_user_pools_web_client_id": "7h3ss3vjn49hemb6f8t9tg13vn"
};

// This is the Invoke URL for your API Gateway
const API_GATEWAY_INVOKE_URL = 'https://5i66lfpob2.execute-api.us-east-1.amazonaws.com/';

Amplify.configure(awsconfig);

// --- Main Application Logic ---
const App = () => {
    const emailInput = document.getElementById('email-input');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const statusMessage = document.getElementById('status-message');

    // On page load, try to get the user's email from browser storage
    if(emailInput) {
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail) {
            emailInput.value = savedEmail;
        }
    }

    const handleUpload = async () => {
        if (!fileInput.files.length) {
            statusMessage.textContent = "Please select at least one file.";
            statusMessage.style.color = 'red';
            return;
        }
        if (!emailInput.value) {
            statusMessage.textContent = "Please enter your email address.";
            statusMessage.style.color = 'red';
            return;
        }

        uploadButton.disabled = true;
        statusMessage.textContent = "Preparing secure upload...";
        statusMessage.style.color = 'black';

        try {
            // 1. Get the current user's session token
            const session = await Auth.currentSession();
            const jwtToken = session.getIdToken().getJwtToken();

            // 2. Prepare the list of filenames for the backend
            const filenames = Array.from(fileInput.files).map(file => file.name);

            // 3. Call our "gatekeeper" Lambda via API Gateway to get secure URLs
            const response = await fetch(API_GATEWAY_INVOKE_URL + 'generate-upload-url', {
                method: 'POST',
                headers: {
                    'Authorization': jwtToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailInput.value,
                    filenames: filenames
                })
            });

            if (!response.ok) {
                throw new Error('Could not get secure upload links.');
            }

            const { uploadUrls } = await response.json();

            // 4. Upload each file directly to S3 using the pre-signed URLs
            statusMessage.textContent = `Uploading ${uploadUrls.length} file(s)...`;
            
            const uploadPromises = uploadUrls.map((item, index) => {
                const file = fileInput.files[index];
                console.log(`Uploading ${file.name} to S3...`);
                return fetch(item.url, {
                    method: 'PUT',
                    body: file,
                    headers: {
                        'Content-Type': 'application/vnd.ms-excel' // Set the correct content type for .xls
                    }
                });
            });

            await Promise.all(uploadPromises);

            // 5. Save the user's email for next time and show success message
            localStorage.setItem('userEmail', emailInput.value);
            statusMessage.textContent = "Upload complete! Your files are being processed. You will receive an email notification when it's done.";
            statusMessage.style.color = 'green';
            fileInput.value = ""; // Clear the file input

        } catch (error) {
            console.error('Upload failed:', error);
            statusMessage.textContent = "Upload failed. Please try again.";
            statusMessage.style.color = 'red';
        } finally {
            uploadButton.disabled = false;
        }
    };
    
    if(uploadButton) {
        uploadButton.addEventListener('click', handleUpload);
    }
};

// This is a workaround to attach our logic after the authenticator loads.
// We check periodically until the elements we need are available.
const observer = new MutationObserver((mutations, obs) => {
    const uploadButton = document.getElementById('upload-button');
    if (uploadButton) {
        App(); // Run our main app logic
        obs.disconnect(); // Stop observing once we've initialized
        return;
    }
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
