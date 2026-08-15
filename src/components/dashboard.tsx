import LeftBar from "./left-bar";
import SearchScreen from "./search-screen";

const Dashboard = () => {
  // first is flex row
  // includes the left bar then wrapper for the rest of prog
  // the wrapper is a flex col
  // includes the top bar and the wrapper for grid+overview
  // grid + overview is a flex row
  return (
    <div className="flex flex-row h-full w-full overflow-hidden bg-background">
      {/* <LeftBar /> */}
      <SearchScreen />
    </div>
  );
};

export default Dashboard;