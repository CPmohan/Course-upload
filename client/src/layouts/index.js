import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import AppSidebar from "./sidebar";
import { Suspense, useState } from "react";
import routes from "./routes";
import BorderLinearProgress from "compounds/progress";

function AppContent() {
  const menus = [
    {
      element: "BasicExample",
      icon: "bxs-dashboard",
      id: 1,
      menu: false,
      name: "",
      path: "/",
    },
    
  ];

  const [selectedMenu, setSelectedMenu] = useState(0);
  const [sidebarState, setSideBarState] = useState(false);
  

  const handleSideBar = () => {
    setSideBarState(!sidebarState);
  };

  return (
    <div className="w-screen h-screen flex">
      <AppSidebar
        open={sidebarState}
        handleSideBar={handleSideBar}
        menu={menus || []}
        selectedmenu={selectedMenu}
        onSelectMenu={setSelectedMenu}
      />

      <div className="flex-1 flex flex-col h-screen w-full overflow-auto">
        <div className="w-full bg-white p-3 h-18 flex items-center justify-between drop-shadow-sm z-50">
          <div className="flex gap-5 items-center">
            <i
              onClick={handleSideBar}
              className={`bx text-3xl ${
                sidebarState ? "bx-x" : "bx-menu"
              } cursor-pointer block sm:hidden`}
            ></i>
            <h3 className="font-medium text-lg">COE</h3>
          </div>
        </div>

        <div className="flex-1 w-full overflow-auto">
          <Suspense
            fallback={
              <div style={{ width: "100%", marginTop: -7 }}>
                <BorderLinearProgress />
              </div>
            }
          >
            <Routes>
              {menus.map((menu) => {
                const Component = routes[menu.element];
                return (
                  <Route
                    key={menu.path}
                    path={menu.path}
                    element={
                      <Component
                        // resetGroupView={resetGroupView}
                        // onResetComplete={() => setResetGroupView(false)}
                      />
                    }
                  />
                );
              })}

              {/* Fallback 404 */}
              <Route
                path="*"
                element={
                  <h1 className="p-3 text-xl text-center">
                    Request URL 404 | Not Found
                  </h1>
                }
              />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
