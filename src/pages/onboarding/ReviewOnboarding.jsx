import { useParams } from "react-router-dom";
const {requestId} = useParams();
const [request, setRequest] = useState(null);

const [loading, setLoading] = useState(true);

function ReviewOnboarding (){

    const companyCode = localStorage.getItem("companyCode");
    
    useEffect(() => {

    loadRequest();

}, []);

   
}
