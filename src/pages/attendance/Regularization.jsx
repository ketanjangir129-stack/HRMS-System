import { Navigate } from "react-router-dom";

/*
|--------------------------------------------------------------------------
| Regularization
|--------------------------------------------------------------------------
| Attendance regularization is handled end to end by the attendance requests
| module (raise, edit, approve, reject). The route is kept so existing links
| keep working and sends the user there.
|--------------------------------------------------------------------------
*/

function Regularization() {
  return <Navigate to="/attendance/requests" replace />;
}

export default Regularization;
