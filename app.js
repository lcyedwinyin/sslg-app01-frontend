// The Amplify object is available globally from the <script> tag in index.html.

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
    // This function will now only run after the entire page is loaded.
    Amplify.configure(awsconfig);

    // --- Element Selectors ---
    const authContainer = document.getElementById('auth-container');
    const appContent = document.getElementById('app-content');
    
    // --- UI Toggling Functions ---
    function showAppContent(user) {
        authContainer.classList.add('hidden');
        appContent.classList.remove('hidden');
        
        const welcomeMessage = document.getElementById('welcome-message');
        const emailInput = document.getElementById('email-input');
        
        const userEmail = user.attributes.email;
        welcomeMessage.textContent = `Welcome, ${userEmail}!`;
        const savedEmail = localStorage.getItem('userEmailForNotifications');
        emailInput.value = savedEmail || userEmail;

        // Attach event listeners only AFTER the app content is visible
        setupAppEventListeners();
    }

    function showAuthContainer(formToShow = 'signin') {
        appContent.classList.add('hidden');
        authContainer.classList.remove('hidden');
        
        document.getElementById('signin-form').classList.toggle('hidden', formToShow !== 'signin');
        document.getElementById('signup-form').classList.toggle('hidden', formToShow !== 'signup');
        document.getElementById('confirm-form').classList.toggle('hidden', formToShow !== 'confirm');
    }

    // --- Authentication Logic ---
    async function handleSignIn() {
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;
        try {
            const user = await Amplify.Auth.signIn(email, password);
            showAppContent(user);
        } catch (error) {
            alert(`Sign in failed: ${error.message}`);
        }
    }

    async function handleSignUp() {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        try {
            await Amplify.Auth.signUp({ username: email, password, attributes: { email } });
            alert('Sign up successful! Please check your email for a verification code.');
            showAuthContainer('confirm');
        } catch (error) {
            alert(`Sign up failed: ${error.message}`);
        }
    }

    async function handleConfirmSignUp() {
        const email = document.getElementById('signup-email').value; // This needs to persist from the signup form
        const code = document.getElementById('confirm-code').value;
        try {
            await Amplify.Auth.confirmSignUp(email, code);
            alert('Account confirmed! You can now sign in.');
            showAuthContainer('signin');
        } catch (error) {
            alert(`Confirmation failed: ${error.message}`);
        }
    }

    // --- Event Listener Setup ---
    // Listeners for the forms that are always present
    document.getElementById('signin-button').addEventListener('click', handleSignIn);
    document.getElementById('signup-button').addEventListener('click', handleSignUp);
    document.getElementById('confirm-button').addEventListener('click', handleConfirmSignUp);
    document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); showAuthContainer('signup'); });
    document.getElementById('show-signin').addEventListener('click', (e) => { e.preventDefault(); showAuthContainer('signin'); });

    // This function sets up listeners for the main app content
    function setupAppEventListeners() {
        document.getElementById('sign-out-button').addEventListener('click', () => Amplify.Auth.signOut().then(() => showAuthContainer()));
        document.getElementById('upload-button').addEventListener('click', handleUpload);
    }

    // The upload logic itself
    async function handleUpload() {
        const fileInput = document.getElementById('file-input');
        const emailInput = document.getElementById('email-input');
        const uploadButton = document.getElementById('upload-button');
        const statusMessage = document.getElementById('status-message');

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
                headers: { 'Authorization': jwtToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailInput.value, filenames: filenames })
            });

            if (!response.ok) throw new Error('Could not get secure upload links.');

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
            statusMessage.textContent = "Upload complete! You will receive an email notification when it's done.";
            statusMessage.style.color = 'green';
            fileInput.value = "";

        } catch (error) {
            console.error('Upload failed:', error);
            statusMessage.textContent = `Upload failed: ${error.message}`;
            statusMessage.style.color = 'red';
        } finally {
            uploadButton.disabled = false;
        }
    }

    // --- Initial State Check ---
    // Check if a user is already signed in when the page loads
    Amplify.Auth.currentAuthenticatedUser()
        .then(user => showAppContent(user))
        .catch(() => showAuthContainer());
}

// --- FIX APPLIED HERE ---
// This ensures that our main() function only runs after the entire page,
// including the external Amplify library script, is fully loaded.
window.addEventListener('load', main);
