// Owner ka currentUser sirf { role, name, email } hota hai, jabki HR/Employee ka
// pura employee record aata hai — dono ke liye ek hi display naam yahin se milta hai.
export const getUserName = (user) =>
  user?.personalInfo?.name ||
  user?.name ||
  user?.employmentInfo?.name ||
  user?.account?.username ||
  "User";

export const getInitials = (user) =>
  getUserName(user)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "U";
