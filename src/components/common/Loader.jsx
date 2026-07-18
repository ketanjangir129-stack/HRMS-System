function Loader({ text = "Loading..." }) {
    return (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[60vh]">
            <svg
                className="animate-spin h-8 w-8 text-blue-600"
                viewBox="0 0 24 24"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="5"
                    fill="none"
                    className="opacity-25"
                />
                <path
                    fill="currentColor"
                    className="opacity-75"
                    d="M12 2a10 10 0 00-10 10h4a6 6 0 016-6V2z"
                />
            </svg>
            <p className="mt-4 text-md text-slate-500 font-semibold">
                {text}
            </p>
        </div>
    );
}

export default Loader;