# Feature Specification: API Authentication Integration

**Feature Branch**: `001-api-auth-integration`
**Created**: 2025-10-16
**Status**: Draft
**Input**: User description: "implementar autenticacao conforme api @doc/for-agent-extension.md"

## Clarifications

### Session 2025-10-16

- Q: Network failure strategy during authentication - How should the system handle network errors when API calls fail (login, registration, password reset, etc.)? → A: Show error immediately with manual retry button
- Q: Behavior with operator without SIP extension - What should happen when an operator successfully authenticates but has no SIP extension configured? → A: Allow login but show warning message about missing extension with link to configuration
- Q: Token expiration during active session - What should happen when JWT token expires while operator is actively using the extension? → A: Detect expiration and redirect to login silently without notification
- Q: Email confirmation link clicked multiple times - What should happen when operator clicks the email confirmation link more than once? → A: Accept all clicks, show success message even if already confirmed previously
- Q: Concurrent logins from different devices - What should happen when operator logs in from multiple devices simultaneously? → A: Allow multiple simultaneous sessions (operator can be logged in on multiple devices)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Operator Registration and Account Setup (Priority: P1)

A new operator needs to create an account in the system to start making calls. They will provide their personal information, company details, and optionally configure their SIP extension during registration.

**Why this priority**: This is the entry point for all users. Without registration capability, no one can use the system. It's the foundation for all other authentication flows.

**Independent Test**: Can be fully tested by filling out the registration form with valid data and verifying that a new account is created with email confirmation sent. Delivers immediate value by allowing new users to join the platform.

**Acceptance Scenarios**:

1. **Given** a new operator on the registration screen, **When** they provide valid email, password, name, company name, and CNPJ, **Then** their account is created and a confirmation email is sent
2. **Given** an operator registering with SIP extension details, **When** they include extension number, SIP server, port, and password, **Then** the extension is automatically configured and linked to their account
3. **Given** an operator registering with an existing email, **When** they submit the form, **Then** they receive an error message indicating the email is already in use
4. **Given** an operator registering with invalid CNPJ format, **When** they submit the form, **Then** they receive validation error for the CNPJ field
5. **Given** an operator registering without required fields, **When** they attempt to submit, **Then** they see clear error messages for each missing required field

---

### User Story 2 - Email Confirmation (Priority: P1)

After registration, operators must confirm their email address before they can log in. They receive an email with a confirmation link that validates their account.

**Why this priority**: Email confirmation is critical for security and preventing spam accounts. It's a mandatory step before operators can access the system.

**Independent Test**: Can be tested by registering a new account, clicking the confirmation link in the email, and verifying that the account status changes to confirmed. Delivers value by ensuring legitimate users and reducing spam.

**Acceptance Scenarios**:

1. **Given** an operator who just registered, **When** they click the confirmation link in their email, **Then** their email is confirmed and they can proceed to login
2. **Given** an operator who didn't receive the confirmation email, **When** they request to resend the confirmation email, **Then** a new confirmation email is sent
3. **Given** an operator with an expired confirmation token, **When** they click the link, **Then** they see an error and option to resend confirmation
4. **Given** an operator trying to login without confirming email, **When** they attempt to login, **Then** they receive an error prompting them to confirm their email first

---

### User Story 3 - Operator Login with Automatic SIP Configuration (Priority: P1)

Registered operators with confirmed emails can log into the softphone extension. Upon successful login, the system automatically configures their SIP extension with the returned credentials, eliminating manual setup.

**Why this priority**: Login is essential for returning users to access the system. The automatic SIP configuration is the core value proposition of this authentication system for the softphone.

**Independent Test**: Can be tested by logging in with valid credentials and verifying that the JWT token is stored and the SIP extension is automatically configured with the returned parameters. Delivers immediate value by providing seamless access to the softphone.

**Acceptance Scenarios**:

1. **Given** an operator with confirmed email on the login screen, **When** they provide valid email, password, and CNPJ, **Then** they receive a JWT token and their SIP extension is automatically configured
2. **Given** an operator logging in successfully, **When** the authentication completes, **Then** the JWT token is stored securely in chrome.storage.session
3. **Given** an operator with incorrect credentials, **When** they attempt to login, **Then** they receive a clear error message and their attempt is counted toward rate limiting
4. **Given** an operator who exceeds 5 login attempts in 15 minutes, **When** they try to login again, **Then** they receive a rate limit error
5. **Given** an operator with multiple companies, **When** they login with a specific CNPJ, **Then** the session is associated with that company context

---

### User Story 4 - Profile Management and Session Validation (Priority: P2)

Logged-in operators can view their profile information and the system validates their session on app startup to maintain authenticated state.

**Why this priority**: Profile access allows users to verify their account details and extension configuration. Session validation ensures seamless user experience across app restarts.

**Independent Test**: Can be tested by logging in and fetching the profile endpoint, verifying all user data and extension details are returned correctly. Delivers value by providing users visibility into their account state.

**Acceptance Scenarios**:

1. **Given** an authenticated operator, **When** the extension starts up, **Then** the profile endpoint is called to validate the stored JWT token
2. **Given** an authenticated operator viewing their profile, **When** they access profile settings, **Then** they see their name, email, role, company, and extension details
3. **Given** an operator with an expired token, **When** the profile fetch fails with 401, **Then** they are logged out and redirected to login screen
4. **Given** an authenticated operator, **When** they view their extension details, **Then** they see extension number, SIP server, and port (password remains encrypted)

---

### User Story 5 - Password Change (Priority: P2)

Authenticated operators can change their password while logged in by providing their current password and a new password.

**Why this priority**: Password changes are important for security but not critical for initial system usage. Users should be able to update their credentials proactively.

**Independent Test**: Can be tested by logging in and changing the password, then logging out and logging back in with the new password. Delivers value by allowing users to maintain account security.

**Acceptance Scenarios**:

1. **Given** an authenticated operator, **When** they provide their current password and a valid new password, **Then** their password is updated successfully
2. **Given** an operator changing password with incorrect current password, **When** they submit the form, **Then** they receive an error indicating current password is incorrect
3. **Given** an operator changing password with weak new password, **When** they submit the form, **Then** they receive validation errors about password requirements
4. **Given** an operator who successfully changed password, **When** they log out and log back in with the new password, **Then** authentication succeeds

---

### User Story 6 - Password Reset (Priority: P2)

Operators who forgot their password can request a password reset link via email and set a new password without being logged in.

**Why this priority**: Password reset is essential for account recovery but not needed for daily operations. It's a fallback mechanism for locked-out users.

**Independent Test**: Can be tested by requesting password reset, clicking the link in email, setting a new password, and logging in with the new credentials. Delivers value by preventing permanent account lockout.

**Acceptance Scenarios**:

1. **Given** an operator on the login screen, **When** they click "Forgot Password" and enter their email, **Then** a password reset email is sent if the account exists
2. **Given** an operator who received a reset link, **When** they click the link and provide a new password, **Then** their password is reset and they can login with the new password
3. **Given** an operator with an expired reset token, **When** they try to use it, **Then** they receive an error and option to request a new reset link
4. **Given** an operator requesting reset for non-existent email, **When** they submit the request, **Then** they receive a generic success message (security best practice to not reveal account existence)
5. **Given** an operator requesting multiple password resets, **When** they submit requests within 1 minute, **Then** they receive a cooldown error

---

### User Story 7 - Call Recording Upload to Backend (Priority: P1)

After completing a call, the softphone automatically uploads the call audio recording and metadata to the backend for analysis and reporting. The system stores project and insight IDs received during authentication to link calls to the correct analytics context.

**Why this priority**: Call upload is the core business value of the softphone - without it, calls cannot be tracked, analyzed, or reported. This is essential for the analytics and insights features.

**Independent Test**: Can be tested by making a test call, recording audio, and verifying that audio file and metadata are successfully uploaded to the backend with correct project/insight IDs. Delivers immediate value by enabling call tracking and analytics.

**Acceptance Scenarios**:

1. **Given** an authenticated operator who completes a call, **When** the call ends, **Then** the system uploads audio file and metadata (caller, callee, startedAt, durationSeconds) to the softphone upload endpoint
2. **Given** an operator during registration, **When** registration succeeds, **Then** the system receives and stores defaultProjectId, defaultInsightId, and softphoneUploadUrl
3. **Given** an operator during login, **When** authentication succeeds, **Then** the system receives and stores defaultProjectId, defaultInsightId, and softphoneUploadUrl
4. **Given** an operator uploading a call with missing required metadata, **When** the upload request is sent, **Then** the system receives a 400 error with specific field validation messages
5. **Given** an operator uploading a call with expired token, **When** the upload request is sent, **Then** the system receives a 401 error and triggers re-authentication
6. **Given** an operator uploading multiple calls rapidly, **When** rate limit is exceeded, **Then** the system receives a 429 error and queues the upload for retry after cooldown

---

### User Story 8 - Secure Logout (Priority: P3)

Authenticated operators can log out of the extension, which invalidates their session on the server and clears local credentials and SIP configuration.

**Why this priority**: Logout is important for security, especially on shared computers, but is not critical for core functionality. Users can close the extension as an alternative.

**Independent Test**: Can be tested by logging in, then logging out, and verifying that the token is removed and the user cannot access protected features. Delivers value by allowing clean session termination.

**Acceptance Scenarios**:

1. **Given** an authenticated operator, **When** they click logout, **Then** the server session is terminated and local storage is cleared
2. **Given** an operator who logged out, **When** they try to access protected features, **Then** they are redirected to the login screen
3. **Given** an operator who logged out, **When** they reopen the extension, **Then** they see the login screen
4. **Given** an operator logging out, **When** the logout completes, **Then** their SIP extension configuration is cleared from memory

---

### Edge Cases

- **Network failures during authentication**: When API server is unreachable or network timeout occurs during login/registration/password reset, system displays error message immediately with manual "Tentar Novamente" (Retry) button
- **API timeout duration**: Network requests timeout after standard browser timeout (no custom timeout override)
- What happens when a user tries to register with a CNPJ that's already in use?
- **JWT token expiration during active session**: When token expires while operator is using the extension, any API call that receives 401 Unauthorized triggers silent logout (clear storage) and redirect to login screen without notification message
- **Email confirmation link clicked multiple times**: When operator clicks confirmation link multiple times (or clicks after already confirmed), system accepts the request and shows success message regardless of previous confirmation status (idempotent behavior)
- **Concurrent logins from different devices**: System allows multiple simultaneous sessions - operator can be logged in from multiple devices/browsers at the same time without invalidating previous sessions (each device maintains independent JWT token)
- What happens when the SIP server details returned from login are invalid or unreachable?
- How does the system handle special characters in passwords during registration and login?
- What happens when chrome.storage.session fails to store the JWT token?
- **Operator without SIP extension**: When operator authenticates successfully but has no SIP extension configured, login proceeds normally, profile is accessible, but a warning banner displays "Extensão SIP não configurada. Configure agora para fazer chamadas." with link to extension configuration (softphone features remain disabled until extension is configured)
- What happens when rate limiting is triggered but the user has legitimate need to login?
- How does the system handle timezone differences in token expiration?
- **Call upload failure during network issues**: When call upload fails due to network error, system queues the upload locally and retries with exponential backoff (1s, 2s, 4s) up to 3 attempts, then displays error with manual retry option
- **Call upload with missing project/insight IDs**: If defaultProjectId or defaultInsightId are missing from authentication response, call upload still proceeds (backend handles default assignment)
- **Call audio file size limits**: System validates audio file size before upload (maximum determined by backend API limits), displays error if too large
- **Multiple pending call uploads**: System maintains upload queue to handle multiple completed calls, processes sequentially to avoid overwhelming API

## Requirements *(mandatory)*

### Functional Requirements

#### Registration and Account Creation

- **FR-001**: System MUST allow new operators to register by providing email, password, name, company name, and either CNPJ or CPF
- **FR-002**: System MUST validate email format before submitting registration
- **FR-003**: System MUST enforce password requirements (minimum length, complexity as defined by backend API)
- **FR-004**: System MUST validate CNPJ format (14 digits) before submitting registration
- **FR-005**: System MUST allow optional SIP extension configuration during registration (extension number, SIP server, port, SIP password)
- **FR-006**: System MUST display clear validation errors for each field that fails validation
- **FR-007**: System MUST show success confirmation after successful registration directing user to check email

#### Email Confirmation

- **FR-008**: System MUST provide capability to confirm email address using access token from confirmation link (idempotent - multiple clicks show success even if already confirmed)
- **FR-009**: System MUST allow users to request resend of confirmation email
- **FR-010**: System MUST display appropriate error messages for expired or invalid confirmation tokens
- **FR-011**: System MUST prevent login attempts from unconfirmed accounts with clear error message

#### Authentication and Login

- **FR-012**: System MUST authenticate operators using email, password, and CNPJ
- **FR-013**: System MUST store JWT token securely in chrome.storage.session upon successful login
- **FR-014**: System MUST include Authorization header (Bearer token) in all authenticated API requests
- **FR-015**: System MUST automatically configure SIP extension using parameters returned from login (extension number, SIP server, port, encrypted SIP password) if extension data is present
- **FR-015a**: System MUST display warning banner "Extensão SIP não configurada. Configure agora para fazer chamadas." with link to configuration when operator login succeeds but no SIP extension data is returned
- **FR-016**: System MUST validate JWT token on extension startup by calling profile endpoint
- **FR-017**: System MUST handle 401 Unauthorized responses by silently logging out user (clear token from storage, clear SIP configuration) and redirecting to login screen without notification message
- **FR-018**: System MUST display user-friendly error messages for authentication failures (invalid credentials, account not found, etc.)
- **FR-019**: System MUST respect rate limiting (5 login attempts per 15 minutes per IP/user)
- **FR-020**: System MUST display rate limit error when threshold is exceeded

#### Profile Management

- **FR-021**: System MUST allow authenticated users to fetch their profile information (id, email, name, role, company, extension details)
- **FR-022**: System MUST display extension configuration (number, SIP server, port) but never display unencrypted SIP password
- **FR-023**: System MUST handle profile fetch failures gracefully with appropriate error messages

#### Password Management

- **FR-024**: System MUST allow authenticated users to change their password by providing current password and new password
- **FR-025**: System MUST validate current password before allowing password change
- **FR-026**: System MUST enforce password requirements for new password during change
- **FR-027**: System MUST allow unauthenticated users to request password reset via email
- **FR-028**: System MUST allow users to complete password reset using access token and new password
- **FR-029**: System MUST enforce 1-minute cooldown on password reset requests per email
- **FR-030**: System MUST display generic success message for password reset requests regardless of account existence (security best practice)
- **FR-031**: System MUST display appropriate error messages for expired or invalid reset tokens

#### Call Recording Upload

- **FR-032**: System MUST store defaultProjectId, defaultInsightId, and softphoneUploadUrl received from registration, login, and profile endpoints
- **FR-033**: System MUST upload call audio file and metadata to softphoneUploadUrl after each completed call
- **FR-034**: System MUST include required metadata in upload: caller (phone number), callee (phone number), startedAt (ISO 8601 timestamp), durationSeconds (integer)
- **FR-035**: System MUST send upload request with Authorization header containing Supabase access_token
- **FR-036**: System MUST handle upload errors: 400 (validation), 401 (re-authenticate), 429 (rate limit queue), 500 (retry)
- **FR-037**: System MUST implement upload retry queue with exponential backoff (1s, 2s, 4s) for network failures, maximum 3 automatic attempts
- **FR-038**: System MUST display manual retry option when automatic retries are exhausted
- **FR-039**: System MUST maintain local queue for multiple pending uploads and process sequentially
- **FR-040**: System MUST validate audio file size before upload attempt
- **FR-041**: System MUST include defaultProjectId and defaultInsightId in upload metadata when available

#### Session Management and Logout

- **FR-042**: System MUST allow authenticated users to log out
- **FR-043**: System MUST call logout API endpoint with user ID when user initiates logout
- **FR-044**: System MUST remove JWT token from chrome.storage.session upon logout
- **FR-045**: System MUST clear SIP extension configuration from memory upon logout
- **FR-046**: System MUST redirect to login screen after successful logout
- **FR-047**: System MUST clear stored defaultProjectId, defaultInsightId, and softphoneUploadUrl upon logout

#### Error Handling and User Experience

- **FR-048**: System MUST handle network errors during authentication by displaying user-friendly error message immediately with manual "Tentar Novamente" (Retry) button (no automatic retry for auth flows)
- **FR-049**: System MUST display loading indicators during authentication API calls
- **FR-050**: System MUST handle API error responses according to standard error codes:
  - 400: Validation error - display specific validation messages
  - 401: Unauthorized - trigger logout flow
  - 403: Forbidden - display permission error
  - 404: Not found - display resource not found message
  - 409: Conflict - display conflict message (e.g., duplicate CNPJ)
  - 429: Rate limit - display rate limit message with retry guidance
  - 500: Internal server error - display generic error with retry option
- **FR-051**: System MUST sanitize all user inputs before sending to API (email, CNPJ, CPF, phone numbers)
- **FR-052**: System MUST never log sensitive data (passwords, tokens, SIP credentials, audio content) to console or error tracking

#### API Integration

- **FR-053**: System MUST use base URL https://api.stage.scany.com.br/api/v1 for all API requests
- **FR-054**: System MUST set Content-Type: application/json for all API requests (except audio upload which uses multipart/form-data)
- **FR-055**: System MUST set Authorization: Bearer <token> header for all authenticated endpoints including softphone uploads
- **FR-056**: System MUST handle HTTPS properly and enforce secure connections in production

### Key Entities

- **Operator**: Represents a user who operates the softphone. Key attributes: id, email, name, role, company association, linked SIP extension, defaultProjectId, defaultInsightId. Relationship: belongs to one company, has one SIP extension (1:1), has many call recordings.

- **Company**: Represents the organization the operator belongs to. Key attributes: id, name, document (CNPJ/CPF), type (determines multi-tenant context). Relationship: has many operators, has one default project.

- **SIP Extension**: Represents the VoIP configuration for an operator. Key attributes: id, extension number, SIP server address, SIP port, encrypted SIP password. Relationship: belongs to one operator (1:1).

- **Authentication Session**: Represents an active authenticated session. Key attributes: JWT token (Supabase access_token), user id, expiration time, company context, softphoneUploadUrl. Relationship: belongs to one operator.

- **Call Recording**: Represents metadata and audio from a completed call. Key attributes: caller phone number, callee phone number, startedAt timestamp, durationSeconds, audio file reference, projectId, insightId, upload status. Relationship: belongs to one operator, belongs to one project, belongs to one insight.

- **Project**: Represents analytics project for call grouping. Key attributes: id (defaultProjectId). Automatically created during operator registration. Relationship: belongs to one company, has many call recordings.

- **Insight**: Represents analytics insight configuration. Key attributes: id (defaultInsightId). Pre-configured during operator registration. Relationship: has many call recordings.

- **Upload Queue**: Represents pending call uploads awaiting processing. Key attributes: call recording reference, retry count, next retry timestamp, error messages. Lifecycle: created after call completion, deleted after successful upload or manual cancellation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New operators can complete registration including SIP configuration in under 3 minutes
- **SC-002**: 95% of valid login attempts succeed within 2 seconds (excluding network latency)
- **SC-003**: Email confirmation process completes successfully for 98% of users on first attempt
- **SC-004**: Zero sensitive data (passwords, tokens) exposed in browser console or error logs during any authentication flow
- **SC-005**: Password reset requests complete successfully within 1 minute (from request to setting new password)
- **SC-006**: SIP extension is automatically configured correctly for 100% of successful logins
- **SC-007**: System handles 500 concurrent authentication requests without degradation
- **SC-008**: JWT token validation on app startup completes within 1 second
- **SC-009**: 90% of users successfully complete first login without assistance
- **SC-010**: Rate limiting prevents brute force attacks while allowing 95% of legitimate retry attempts
- **SC-011**: Session state persists correctly across browser restarts for 100% of authenticated users
- **SC-012**: All API errors result in user-friendly messages with clear next steps for 100% of error scenarios
- **SC-013**: 98% of call recordings are successfully uploaded to backend within 30 seconds of call completion
- **SC-014**: Upload queue processes pending uploads with 95% success rate after network recovery
- **SC-015**: Operators receive defaultProjectId and defaultInsightId for 100% of successful registrations
- **SC-016**: Call metadata validation catches 100% of missing required fields before upload attempt
- **SC-017**: Upload retry mechanism recovers from transient failures for 90% of initially failed uploads

## Assumptions

1. **Email Service Reliability**: Assumes the Supabase email service is properly configured and emails are delivered reliably. If email delivery fails frequently, additional user communication mechanisms may be needed.

2. **Token Expiration**: Assumes JWT tokens have a reasonable expiration time (e.g., 24 hours) set by the backend. Token refresh is not implemented in this phase.

3. **Multiple Device Sessions**: Multiple concurrent sessions from different devices are explicitly allowed. Each device maintains independent JWT token without invalidating other active sessions.

4. **Chrome Storage Availability**: Assumes chrome.storage.session API is available and reliable. Fallback to chrome.storage.local may be needed for some Chrome versions.

5. **CNPJ Uniqueness**: Assumes CNPJ/CPF validation is primarily handled by backend API. Frontend performs format validation only.

6. **SIP Password Security**: Assumes the encrypted SIP password returned by backend is suitable for use without additional client-side encryption.

7. **Network Reliability**: Assumes reasonable network connectivity. Offline mode and request queuing are not included in this phase.

8. **Single Company per Operator**: Assumes each operator belongs to exactly one company in most cases. Multi-company scenarios require specifying CNPJ during login.

9. **English and Portuguese Support**: Assumes UI text will be in Portuguese (pt-br) as specified in project guidelines.

10. **Extension Popup Lifecycle**: Assumes the extension popup may close frequently. All authentication state must be persisted to storage, not kept only in memory.

11. **Automatic Project Creation**: Assumes backend automatically creates defaultProject and defaultInsight during registration. Frontend does not need to create these entities.

12. **Audio Format Support**: Assumes backend accepts common audio formats (wav, mp3, webm). Frontend uses browser-supported recording format without transcoding.

13. **Upload Queue Persistence**: Assumes failed uploads must persist across browser restarts. Upload queue stored in chrome.storage.local for durability.

14. **Network Bandwidth**: Assumes reasonable upload bandwidth for audio files (typical call recordings 1-5MB). No progress bar for uploads under 10 seconds.

15. **Synchronous Upload**: Assumes uploads happen immediately after call completion (not batched). Each call uploads independently.

## Dependencies

- **Backend API**: All authentication endpoints must be available and functional at https://api.stage.scany.com.br/api/v1
- **Supabase Email Service**: Required for email confirmation and password reset flows
- **Chrome Extension Storage API**: chrome.storage.session for secure token storage
- **JsSIP Library**: Already present in the project for SIP functionality that will be configured after authentication
- **React and Chakra UI**: Already present for building authentication UI components
- **google-libphonenumber**: May be useful for CNPJ/phone number validation

## Out of Scope

- **Token Refresh**: Automatic JWT token refresh before expiration is not included
- **Biometric Authentication**: Fingerprint or face ID login is not included
- **Two-Factor Authentication (2FA)**: Additional authentication factors beyond password are not included
- **Social Login**: OAuth login via Google, Facebook, etc. is not included
- **Remember Me**: Persistent login across browser restarts beyond JWT expiration is not included
- **Account Deletion**: Self-service account deletion is not included
- **Profile Editing**: Changing name, email, company details is not included (only password change)
- **Multi-Factor SIP Configuration**: Support for multiple SIP extensions per operator is not included
- **Advanced Rate Limiting UI**: Detailed countdown timers or rate limit status display is not included
- **Offline Authentication**: Cached credentials for offline login are not included
- **Session Management UI**: Viewing/terminating sessions from other devices is not included
- **Audit Logging UI**: Viewing authentication history and security events is not included
- **Admin Impersonation**: Admin capability to log in as another user is not included
- **Call Transcription**: Automatic transcription of call audio is handled by backend, not by extension
- **Call Analytics UI**: Viewing analytics, insights, and reports is not included in extension (separate web dashboard)
- **Manual Project/Insight Selection**: Operators cannot manually select different project/insight for calls (uses defaults only)
- **Audio Compression**: Client-side audio compression before upload is not included
- **Upload Progress Bar**: Detailed upload progress indicators are not included (loading spinner only)
- **Bulk Upload Management**: UI to view, cancel, or retry all pending uploads at once is not included
- **Local Call History**: Viewing past uploaded calls within extension is not included
- **Audio Playback**: Playing back recorded calls within extension is not included
