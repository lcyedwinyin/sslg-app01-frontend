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
    Amplify.configure(awsconfig);

    // --- Element Selectors ---
    const authContainer = document.getElementById('auth-container');
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');
    const confirmForm = document.getElementById('confirm-form');
    const appContent = document.getElementById('app-content');
    const welcomeMessage = document.getElementById('welcome-message');
    
    // --- UI Toggling Functions ---
    function showAppContent(user) {
        authContainer.classList.add('hidden');
        appContent.classList.remove('hidden');
        const userEmail = user.attributes.email;
        welcomeMessage.textContent = `Welcome, ${userEmail}!`;
        const savedEmail = localStorage.getItem('userEmailForNotifications');
        document.getElementById('email-input').value = savedEmail || userEmail;
    }

    function showAuthContainer(formToShow = 'signin') {
        appContent.classList.add('hidden');
        authContainer.classList.remove('hidden');
        
        signinForm.classList.add('hidden');
        signupForm.classList.add('hidden');
        confirmForm.classList.add('hidden');

        if (formToShow === 'signup') {
            signupForm.classList.remove('hidden');
        } else if (formToShow === 'confirm') {
            confirmForm.classList.remove('hidden');
        } else {
            signinForm.classList.remove('hidden');
        }
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
        const email = document.getElementById('signup-email').value;
        const code = document.getElementById('confirm-code').value;
        try {
            await Amplify.Auth.confirmSignUp(email, code);
            alert('Account confirmed! You can now sign in.');
            showAuthContainer('signin');
        } catch (error) {
            alert(`Confirmation failed: ${error.message}`);
        }
    }

    // --- Event Listeners ---
    document.getElementById('signin-button').addEventListener('click', handleSignIn);
    document.getElementById('signup-button').addEventListener('click', handleSignUp);
    document.getElementById('confirm-button').addEventListener('click', handleConfirmSignUp);
    document.getElementById('sign-out-button').addEventListener('click', () => Amplify.Auth.signOut().then(() => showAuthContainer()));
    document.getElementById('show-signup').addEventListener('click', (e) => { e.preventDefault(); showAuthContainer('signup'); });
    document.getElementById('show-signin').addEventListener('click', (e) => { e.preventDefault(); showAuthContainer('signin'); });

    // Upload logic remains the same
    document.getElementById('upload-button').addEventListener('click', async () => {
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
    });

    // Check initial auth state
    Amplify.Auth.currentAuthenticatedUser()
        .then(user => showAppContent(user))
        .catch(() => showAuthContainer());
}

// Run the main application logic
main();
