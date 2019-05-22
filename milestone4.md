# Milestone 4

#### Table of Contents
1. [Logistics](#Logistics)
2. [UI Skeleton Webpage Screenshots](#Skeleton)
3. [User Actions](#UserActions)

<a name="Logistics"></a>

## Logistics
**Team Name**: Panda Express.js<br>

**Members**:
1. Kai-ling Peng
2. Martin Magsombol
3. Ryan Keng
4. Yidong Luo

<a name="Skeleton"></a>

### UI Skeleton Webpage Screenshots
TODO:
milestone4.md contains a written explanation of how your UI's screenshots have improved upon the versions shown in milestone3.md in a noticeable way.


User is able to sign-in or create an account if they don't have one yet.<br>
![Initial Screen](milestones/assets/Xposure/index.png)<br>

User is able to create an account.<br>
![Create Account Screen](milestones/assets/Xposure/createAccount.png)<br>

Users are able to view different finished prompts in the home page.<br>
![Home Page: Discover](milestones/assets/Xposure/discover.png)<br>

Users are able to view ongoing prompts.<br>
![Prompts Screen](milestones/assets/Xposure/prompts.png)<br>

Users are able to submit their works for each prompt.<br>
![Submission Screen](milestones/assets/Xposure/submission.png)<br>

Users are able to evaluate other people's works for each prompt.<br>
![Evaluation Screen](milestones/assets/Xposure/evaluate.png)<br>

Users are able to view their account information and submitted works in their profile.<br>
![Profile Screen](milestones/assets/Xposure/profile.png)<br>

Users are able to edit their account information.<br>
![Edit Profile Screen](milestones/assets/Xposure/editProfile.png)<br>

Users are able to change their account settings.<br>
![Settings Screen](milestones/assets/Xposure/Settings.png)<br>


<a name="UserActions"></a>

TODO:
milestone4.md contains a written description of at least two non-trivial actions that users can perform when they use your app. These should not be simply logging in or opening static webpages; they need to be substantive actions that demonstrate your app's core functionality, and also differ from one another in a significant way (2 points).

### User Action 1
User submits an image for a prompt.

1. User has an Xposure account.
2. User visits `index.html` and fills in his/her email and password, and clicks "Log In".
3. User is taken to `Discover.html`, and clicks on one of the Current Prompts available.
4. User is taken to `Prompt.html`, and clicks on "Submit My Work".
5. User is taken to `Submission.html`, where 3 input form fields will be displayed. The user fills in the title, uploads an image (jpeg), and fills in the description (optional). The user clicks on "Continue" to proceed.

### User Action 2
User submits an evaluation for a submission.

Following the steps above, the user is required to submit an evaluation for a randomly selected submission in order to complete his/her submission progress.

6. User is taken to `Evaluate.html`, where 4 input form fields will be displayed. The user fills in the rating for technique (1-10), originality (1-10), a sentence or two for interpretation, and an overall score (1-10). The user clicks on "Submit" to proceed.
7. User is taken to `Disocover.html`.