import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui'; // Corrected import
import '@aws-amplify/ui/dist/styles.css'; // Corrected import path

// --- UPDATED CONFIGURATION ---
// This now contains your specific User Pool and App Client IDs.
const awsconfig = {
    "aws_project_region": "ap-northeast-1",
    "aws_cognito_region": "ap-northeast-1",
    "aws_user_pools_id": "ap-northeast-1_FySpl0LW5",
    "aws_user_pools_web_client_id": "7h3ss3vjn49hemb6f8t9tg13vn"
};

Amplify.configure(awsconfig);

// This makes the <amplify-authenticator> tag work
customElements.define('amplify-authenticator', Authenticator);
