// The Amplify object should now be available globally
console.log('Amplify object:', window.Amplify); // Debug log

// --- Configuration ---
const awsconfig = {
    Auth: {
        Cognito: {
            region: "ap-northeast-1",
            userPoolId: "ap-northeast-1_FySpl0LW5",
            userPoolClientId: "7h3ss3vjn49hemb6f8t9tg13vn"
        }
    }
};

const API_GATEWAY_INVOKE_URL = 'https://w2bumno7gj.execute-api.ap-northeast-1.amazonaws.com/';

// --- Main Application Logic ---
function main() {
    // Use window.Amplify to ensure we're referencing the global object
    if (typeof window.Amplify === 'undefined') {
        console.error('Amplify is not available. Please check if the CDN loaded correctly.');
        return;
    }

    // Configure Amplify with the correct v6 format
    window.Amplify.configure(awsconfig);

    // --- Element Selectors ---
    const authContainer = document.getElementById('auth-container');
    const appContent = document.getElementById('app-content');
    
    // --- UI Toggling Functions ---
    function showAppContent(user) {
        authContainer.classList.add('hidden');
        appContent.classList.remove('hidden');
        
        const welcomeMessage = document.getElementById('welcome-message');
        const emailInput = document.getElementById('email-input');
        
        const userEmail = user.signInDetails?.loginId || user.username;
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
        
        if (!email || !password) {
            alert('Please enter both email and password.');
            return;
        }
        
        try {
            const { isSignedIn, nextStep } = await window.Amplify.Auth.signIn({
                username: email,
                password: password
            });
            
            if (isSignedIn) {
                const user = await window.Amplify.Auth.getCurrentUser();
                showAppContent(user);
            }
        } catch (error) {
            console.error('Sign in error:', error);
            alert(`Sign in failed: ${error.message}`);
        }
    }

    async function handleSignUp() {
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        if (!email || !password) {
            alert('Please enter both email and password.');
            return;
        }
        
        try {
            const { isSignUpComplete, nextStep } = await window.Amplify.Auth.signUp({
                username: email,
                password: password,
                options: {
                    userAttributes: {
                        email: email
                    }
                }
            });
            
            alert('Sign up successful! Please check your email for a verification code.');
            showAuthContainer('confirm');
        } catch (error) {
            console.error('Sign up error:', error);
            alert(`Sign up failed: ${error.message}`);
        }
    }

    async function handleConfirmSignUp() {
        const email = document.getElementById('signup-email').value;
        const code = document.getElementById('confirm-code').value;
        
        if (!email || !code) {
            alert('Please enter the verification code.');
            return;
        }
        
        try {
            const { isSignUpComplete } = await window.Amplify.Auth.confirmSignUp({
                username: email,
                confirmationCode: code
            });
            
            if (isSignUpComplete) {
                alert('Account confirmed! You can now sign in.');
                showAuthContainer('signin');
            }
        } catch (error) {
            console.error('Confirmation error:', error);
            alert(`Confirmation failed: ${error.message}`);
        }
    }

    // --- Event Listener Setup ---
    document.getElementById('signin-button').addEventListener('click', handleSignIn);
    document.getElementById('signup-button').addEventListener('click', handleSignUp);
    document.getElementById('confirm-button').addEventListener('click', handleConfirmSignUp);
    document.getElementById('show-signup').addEventListener('click', (e) => { 
        e.preventDefault(); 
        showAuthContainer('signup'); 
    });
    document.getElementById('show-signin').addEventListener('click', (e) => { 
        e.preventDefault(); 
        showAuthContainer('signin'); 
    });

    // This function sets up listeners for the main app content
    function setupAppEventListeners() {
        document.getElementById('sign-out-button').addEventListener('click', async () => {
            try {
                await window.Amplify.Auth.signOut();
                showAuthContainer();
            } catch (error) {
                console.error('Sign out error:', error);
            }
        });
        document.getElementById('upload-button').addEventListener('click', handleUpload);
    }

    // The upload logic
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
            const session = await window.Amplify.Auth.fetchAuthSession();
            const jwtToken = session.tokens.idToken.toString();
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
    window.Amplify.Auth.getCurrentUser()
        .then(user => showAppContent(user))
        .catch(() => showAuthContainer());
}

// Run the main application logic immediately
main();
