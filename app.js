// The Amplify, Auth, and Hub objects are now available globally 
// because we loaded them via the <script> tags in index.html.

// --- Configuration ---
const awsconfig = {
    Auth: {
        region: "ap-northeast-1",
        userPoolId: "ap-northeast-1_FySpl0LW5",
        userPoolWebClientId: "7h3ss3vjn49hemb6f8t9tg13vn"
    }
};

const API_GATEWAY_INVOKE_URL = 'https://w2bumno7gj.execute-api.ap-northeast-1.amazonaws.com/';

// --- Main Application Logic ---
function main() {
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
    Amplify.Hub.listen('auth', ({ payload: { event, data } }) => {
        switch (event) {
            case 'signedIn':
            case 'autoSignIn': // Handle automatic sign-in on page refresh
                showAppContent(data);
                break;
            case 'signOut':
                showAuthenticator();
                break;
        }
    });

    // Function to show the main app and hide the login
    function showAppContent(user) {
        authenticator.style.display = 'none'; // Use style to hide
        appContent.classList.remove('hidden');
        
        const userEmail = user.attributes.email;
        welcomeMessage.textContent = `Welcome, ${userEmail}!`;
        
        const savedEmail = localStorage.getItem('userEmailForNotifications');
        emailInput.value = savedEmail || userEmail;
    }

    // Function to show the login and hide the main app
    function showAuthenticator() {
        appContent.classList.add('hidden');
        authenticator.style.display = 'block'; // Use style to show
    }
    
    // --- Event Listeners for Buttons ---
    signOutButton.addEventListener('click', () => {
        Amplify.Auth.signOut();
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
            const session = await Amplify.Auth.currentSession();
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
    Amplify.Auth.currentAuthenticatedUser()
        .then(user => showAppContent(user))
        .catch(() => showAuthenticator());
}

// Run the main application logic
main();
