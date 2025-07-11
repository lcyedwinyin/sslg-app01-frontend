// --- FIX APPLIED HERE ---
// We are now importing the Amplify libraries directly from a CDN URL.
// This allows the browser to find and load the necessary code without a build step.
import { Amplify, Auth, Hub } from 'https://cdn.jsdelivr.net/npm/aws-amplify@5/dist/aws-amplify.min.js';
import { applyPolyfills, defineCustomElements } from 'https://cdn.jsdelivr.net/npm/@aws-amplify/ui-components@1/loader/index.es2017.js';

// --- Configuration ---
const awsconfig = {
    "aws_project_region": "ap-northeast-1", 
    "aws_cognito_region": "ap-northeast-1",
    "aws_user_pools_id": "ap-northeast-1_FySpl0LW5",
    "aws_user_pools_web_client_id": "7h3ss3vjn49hemb6f8t9tg13vn"
};

const API_GATEWAY_INVOKE_URL = 'https://w2bumno7gj.execute-api.ap-northeast-1.amazonaws.com/';

// --- Main Application Logic ---
async function main() {
    // Apply polyfills and define the custom elements for the UI components
    await applyPolyfills();
    defineCustomElements(window);
    
    // Configure Amplify first
    Amplify.configure(awsconfig);

    const authenticator = document.querySelector('amplify-authenticator');
    const appContent = document.getElementById('app-content');
    const welcomeMessage = document.getElementById('welcome-message');
    const signOutButton = document.getElementById('sign-out-button');
    const emailInput = document.getElementById('email-input');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const statusMessage = document.getElementById('status-message');

    // Use the Amplify Hub to listen for authentication events
    Hub.listen('auth', ({ payload: { event, data } }) => {
        switch (event) {
            case 'signedIn':
                showAppContent(data);
                break;
            case 'signedOut':
                showAuthenticator();
                break;
        }
    });

    // Function to show the main app and hide the login
    function showAppContent(user) {
        authenticator.classList.add('hidden');
        appContent.classList.remove('hidden');
        const userEmail = user.signInDetails.loginId;
        welcomeMessage.textContent = `Welcome, ${userEmail}!`;
        const savedEmail = localStorage.getItem('userEmailForNotifications');
        emailInput.value = savedEmail || userEmail;
    }

    // Function to show the login and hide the main app
    function showAuthenticator() {
        appContent.classList.add('hidden');
        authenticator.classList.remove('hidden');
    }
    
    // --- Event Listeners for Buttons ---
    signOutButton.addEventListener('click', () => {
        Auth.signOut();
    });

    uploadButton.addEventListener('click', async () => {
        if (!fileInput.files.length || !emailInput.value) {
            statusMessage.textContent = "Please select files and enter an email.";
            statusMessage.style.color = 'red';
            return;
        }

        uploadButton.disabled = true;
        statusMessage.textContent = "Preparing secure upload...";
        statusMessage.style.color = 'black';

        try {
            const session = await Auth.currentSession();
            const jwtToken = session.getIdToken().getJwtToken();
            const filenames = Array.from(fileInput.files).map(file => file.name);

            const response = await fetch(API_GATEWAY_INVOKE_URL + 'generate-upload-url', {
                method: 'POST',
                headers: {
                    'Authorization': jwtToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: emailInput.value, filenames: filenames })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Could not get secure upload links.');
            }

            const { uploadUrls } = await response.json();
            statusMessage.textContent = `Uploading ${uploadUrls.length} file(s)...`;
            
            const uploadPromises = uploadUrls.map((item, index) => {
                const file = fileInput.files[index];
                return fetch(item.url, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': 'application/vnd.ms-excel' }
                });
            });

            await Promise.all(uploadPromises);

            localStorage.setItem('userEmailForNotifications', emailInput.value);
            statusMessage.textContent = "Upload complete! Your files are being processed. You will receive an email notification when it's done.";
            statusMessage.style.color = 'green';
            fileInput.value = "";

        } catch (error) {
            console.error('Upload failed:', error);
            statusMessage.textContent = `Upload failed: ${error.message}`;
            statusMessage.style.color = 'red';
        } finally {
            uploadButton.disabled = false;
        }
    });

    // Check the initial auth state when the page loads
    try {
        const user = await Auth.currentAuthenticatedUser();
        showAppContent(user);
    } catch (err) {
        showAuthenticator();
    }
}

// Run the main application logic
main();
