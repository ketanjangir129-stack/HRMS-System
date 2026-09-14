/*
|--------------------------------------------------------------------------
| Password Change
|--------------------------------------------------------------------------
| The rule a password is held to when somebody sets their own, shared by the
| screens that let them: the forced change a new joiner is sent to, and the
| reset page a link opens.
|
| It is deliberately not `rules.password`. That one also demands a special
| character and caps the length at twenty, and it guards registration - where
| a company is choosing a password for an account that has none yet. This is
| somebody replacing a password they already have or have lost, and the forced
| change screen has always asked for upper, lower, digit and eight characters.
| Pointing these screens at the stricter rule would start refusing passwords
| that are currently in use.
|
| Every function returns a message or an empty string, which is the shape
| `validateField` uses and therefore the shape the forms already expect.
|
| `currentPassword` is optional in the form this validates. The forced change
| screen asks for it; the reset page does not, because the whole reason
| somebody is on it is that they do not have it. A form that leaves the field
| out simply never asks about it.
|--------------------------------------------------------------------------
*/

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const PASSWORD_MESSAGE =
    "Password must be at least 8 characters and contain uppercase, lowercase and number.";

export const validatePasswordChangeField = (name, value, formData = {}) => {

    const text = String(value ?? "").trim();

    if (name === "currentPassword") {
        /*
        | Only that something was typed. What is stored is what says whether
        | it is right, and a pattern check here would refuse to even submit a
        | password that predates the rule - which is exactly the password
        | somebody on the forced change screen is most likely holding.
        */
        return text ? "" : "This field is required.";
    }

    if (name === "newPassword") {

        if (!text) {
            return "This field is required.";
        }

        if (!PASSWORD_PATTERN.test(value)) {
            return PASSWORD_MESSAGE;
        }

        /*
        | Only asked where there is a current password to be the same as. On
        | the reset page this is undefined and the check falls away, which is
        | right: nobody there has typed an old password to be compared with.
        */
        if (formData.currentPassword && value === formData.currentPassword) {
            return "New password cannot be the same as current password.";
        }

        return "";
    }

    if (name === "confirmPassword") {

        if (!text) {
            return "This field is required.";
        }

        if (value !== formData.newPassword) {
            return "Passwords do not match.";
        }

        return "";
    }

    return "";

};

/*
| The whole form at once, for submit. Built from the same function the blur
| handlers call, so a field can never be refused on submit for a reason it
| never showed while it was being typed.
*/
export const validatePasswordChangeForm = (formData) =>
    Object.entries(formData).reduce((problems, [name, value]) => {

        const problem = validatePasswordChangeField(name, value, formData);

        if (problem) {
            problems[name] = problem;
        }

        return problems;

    }, {});
