export const regex = {companyName :
  /^[A-Za-z0-9&.,'()\- ]{3,100}$/,

// Company Code
companyCode :
  /^[A-Z0-9]{3,10}$/,

// Owner Name
ownerName :
  /^[A-Za-z ]{3,50}$/,

// Email
email :
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

// Indian Mobile Number
phone :
  /^[6-9]\d{9}$/,

// Password
password :
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&])[A-Za-z\d@$!%*?#&]{8,20}$/,}