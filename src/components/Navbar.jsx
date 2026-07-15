import "../styles/Navbar.css";
import {
    FaSearch,
    FaBell,
    FaCog,
    FaChevronDown,

} from "react-icons/fa";
function Navbar(){
    return(
        <div className="navbar">

            <div className ="search-box">
                <FaSearch className="search-icon" />
                <input type="text" placeholder="Search..." />
            </div>

            <div className="nav-right">
                <div className="notification">
                <FaBell className="nav-icon" />
                <span className="badge">3</span>
                </div>
                <FaCog className="nav-icon" />

                <div className="profile">
                    <div className="avatar">A</div>
                    <FaChevronDown  className="down-icon"/>
                </div>

            </div>

        </div>
    );
}

export default Navbar;