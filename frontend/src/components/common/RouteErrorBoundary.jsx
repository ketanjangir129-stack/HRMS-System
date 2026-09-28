import { Component } from "react";
import { FiAlertTriangle } from "react-icons/fi";

/*
|--------------------------------------------------------------------------
| Route Error Boundary
|--------------------------------------------------------------------------
| The net under the split routes.
|
| Pages are fetched the first time their route is opened, so a page can now
| fail to arrive: a dropped connection part way through, or - far more often -
| a deploy that happened while somebody had the tab open, which replaces every
| chunk with a new name and leaves the old address pointing at nothing. React
| reports that as a render error, and a render error with nothing to catch it
| unmounts the whole tree and leaves a blank white page.
|
| So the failure is caught and said out loud instead. Reloading is the only
| real cure - the browser is holding an index that no longer matches what is
| deployed - and it is offered as a button rather than done automatically,
| because a reload the user did not ask for would throw away whatever they had
| half typed into the form behind it.
|
| A boundary has to be a class: `componentDidCatch` has no hook.
|--------------------------------------------------------------------------
*/

class RouteErrorBoundary extends Component {

  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("A page failed to render:", error, info);
  }

  render() {

    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="mx-auto flex min-h-screen max-w-[1600px] items-center justify-center p-4">

        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <FiAlertTriangle size={24} />
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-900">
            This page could not be loaded
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Reloading usually fixes it. Nothing you have saved is affected.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 active:translate-y-0"
          >
            Reload
          </button>

        </div>

      </div>
    );

  }

}

export default RouteErrorBoundary;
