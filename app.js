import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui'; // Corrected import
import '@aws-amplify/ui/dist/styles.css'; // Corrected import path

// This is a placeholder configuration.
// In a real project, you would get these values from your Amplify setup.
const awsconfig = {
    "aws_project_region": "ap-northeast-1",
    "aws_cognito_region": "ap-northeast-1",
    "aws_user_pools_id": "YOUR_USER_POOL_ID", // You will get this from Cognito
    "aws_user_pools_web_client_id": "YOUR_APP_CLIENT_ID" // You will get this from Cognito
};

Amplify.configure(awsconfig);

// This makes the <amplify-authenticator> tag work
customElements.define('amplify-authenticator', Authenticator);