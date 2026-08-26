import {
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ListChecks,
  PartyPopper,
  ReceiptIndianRupee,
  Settings,
  TreePalm,
  UserRoundPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useMemo } from "react";
import useRoleAccess from "../hooks/useRoleAccess";

/*
|--------------------------------------------------------------------------
| Menu
|--------------------------------------------------------------------------
| Every item carries the permission it is offered under, so the menu is
| filtered against the company's Roles & Access configuration rather than
| styled away: a link the role cannot open is not in the list at all.
|
| `ownerOnly` is the one exception that is not configurable - Settings is
| where the permissions themselves are edited, so it can only ever belong to
| the owner.
|
| The links are grouped rather than run together as one column of eleven.
| Past about six, a flat list stops being scanned and starts being read, and
| the four headings below are the questions somebody actually arrives with -
| who works here, what are they doing, what are they paid, how is this set
| up. Dashboard needs no heading: it is the first thing in the list and the
| top of a sidebar is already understood to be the landing page.
|
| The order is exactly the order the menu has always been in. Grouping draws
| lines between the items, it does not move any of them.
|
| One icon family, from `lucide-react`. The set used to be assembled from six
| libraries with six different stroke weights and fill styles, which is the
| kind of thing nobody names but everybody sees: a solid glyph beside an
| outlined one reads as the two meaning different kinds of thing.
|--------------------------------------------------------------------------
*/

const menuGroups = [
  {
    label: "",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
        permission: "dashboard",
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        label: "Departments",
        path: "/departments",
        icon: Building2,
        permission: "departments",
      },
      {
        label: "Employees",
        path: "/employees",
        icon: Users,
        permission: "employees",
      },
      {
        label: "On-boarding",
        path: "/OnboardDashboard",
        icon: UserRoundPlus,
        permission: "onboarding",
      },
    ],
  },
  {
    label: "Workforce",
    items: [
      {
        label: "Attendance",
        path: "/attendance",
        icon: CalendarCheck,
        permission: "attendance",
      },
      {
        label: "Leave",
        path: "/leave",
        icon: TreePalm,
        permission: "leave",
      },
      {
        label: "Holidays",
        path: "/holidays",
        icon: PartyPopper,
        permission: "holidays",
      },
      {
        label: "Tasks",
        path: "/tasks",
        icon: ListChecks,
        permission: "tasks",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Salary",
        path: "/salarydashboard",
        icon: Wallet,
        permission: "salary",
      },
      {
        label: "Payroll",
        path: "/payrolldashboard",
        icon: ReceiptIndianRupee,
        permission: "payroll",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        path: "/settings",
        icon: Settings,
        ownerOnly: true,
      },
    ],
  },
];

/*
| The collapsed look belongs to the desktop rail only - below `lg` the
| sidebar is a full-width drawer that is either on screen or off it, so every
| collapse-driven class here is `lg:` prefixed and the expanded layout is the
| mobile default.
*/

const ROW = "flex h-10 items-center gap-3 rounded-xl px-3";

const ROW_COLLAPSED = "lg:justify-center lg:gap-0 lg:px-0";

/*
| Stand-ins for the links while the configuration is read. Rendering the full
| menu first would show links that are about to disappear, and rendering
| nothing would make the sidebar collapse and jump.
|
| It stands in for the grouped menu rather than a flat one, so the headings do
| not drop in after the rows and shift everything down a line.
*/

function SidebarSkeleton({ isCollapsed }) {
  return (
    <div className="space-y-6">

      {[1, 3, 4].map((count, groupIndex) => (

        <div key={groupIndex}>

          {groupIndex > 0 && (
            <div
              className={`mx-3 mb-3 h-2.5 w-16 animate-pulse rounded bg-surface-raised ${
                isCollapsed ? "lg:hidden" : ""
              }`}
            />
          )}

          <ul className="space-y-1">

            {Array.from({ length: count }).map((_, index) => (

              <li key={index}>
                <div className={`${ROW} ${isCollapsed ? ROW_COLLAPSED : ""}`}>

                  <span className="h-[18px] w-[18px] shrink-0 animate-pulse rounded bg-surface-raised" />

                  <span
                    className={`h-3 w-24 animate-pulse rounded bg-surface-raised ${
                      isCollapsed ? "lg:hidden" : ""
                    }`}
                  />

                </div>
              </li>

            ))}

          </ul>

        </div>

      ))}

    </div>
  );
}

function Sidebar({ isCollapsed, onToggle, isMobileOpen = false, onMobileClose }) {

  const { canAccessPage, isOwner, loading } = useRoleAccess();

  /*
  | The permission filter is applied inside each group, and a group left with
  | nothing is dropped along with its heading. Otherwise a role without the
  | money screens would get a "Finance" label standing over empty space.
  */
  const visibleGroups = useMemo(
    () =>
      menuGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            item.ownerOnly ? isOwner : canAccessPage(item.permission)
          ),
        }))
        .filter((group) => group.items.length > 0),
    [canAccessPage, isOwner]
  );

  /*
    Two sidebars in one element.

    On `lg` and up it is a normal flex column in the page that only changes
    width. Below that it is taken out of the flow entirely and parked off the
    left edge, so the content column gets the whole viewport, and the list
    button slides it back in.
  */
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-[280px] flex-col border-r border-line bg-surface transition-[transform,width] duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        ${isCollapsed ? "lg:w-[80px]" : "lg:w-[260px]"}`}
    >

      {/*
        Logo. The same 70px as the navbar beside it, so the rule under this
        block and the rule under the navbar are one unbroken line across the
        top of the app rather than two that miss each other by 25px.
      */}
      <div
        className={`flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line-subtle px-5 ${
          isCollapsed ? "lg:justify-center lg:px-0" : ""
        }`}
      >

        <div className="flex min-w-0 items-center gap-3">

          {/* The mark carries a tinted shadow in its own hue rather than a
              grey one, which is what lifts it off the white rail. */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white shadow-md shadow-brand/25">
            H
          </div>

          <div
            className={`min-w-0 whitespace-nowrap ${
              isCollapsed ? "lg:hidden" : ""
            }`}
          >

            <h2 className="truncate text-[15px] font-bold leading-none text-ink">
              HRMS
            </h2>

            <p className="mt-1 truncate text-[11px] font-medium leading-none text-ink-faint">
              Workforce Management
            </p>

          </div>

        </div>

        {/* The drawer has no visible edge to click past on a phone, so it
            carries its own close button. */}
        <button
          type="button"
          onClick={onMobileClose}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink lg:hidden"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>

      </div>

      {/* Navigation */}
      {/*
        The menu is the only part that scrolls: the logo and the collapse
        button stay put while the links move under them.

        `min-h-0` is what makes that work. A flex child defaults to
        `min-height: auto`, which refuses to shrink below its content, so
        without it the nav would push the collapse button off screen instead
        of scrolling.
      */}
      <nav
        aria-label="Main"
        className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4"
      >

        {loading ? (

          <SidebarSkeleton isCollapsed={isCollapsed} />

        ) : (

          <div className="space-y-6">

            {visibleGroups.map((group) => (

              <div key={group.label || "primary"}>

                {/*
                | The heading, and what stands in for it on the rail. A
                | collapsed sidebar has no room for a word, but the grouping
                | still has to survive - so the label becomes a hairline. Both
                | are `lg:` gated, because below that the sidebar is always the
                | full drawer and always wants the word.
                */}
                {group.label && (
                  <>

                    <p
                      className={`ui-eyebrow px-3 pb-2 ${
                        isCollapsed ? "lg:hidden" : ""
                      }`}
                    >
                      {group.label}
                    </p>

                    {isCollapsed && (
                      <div
                        aria-hidden="true"
                        className="mx-3 mb-3 hidden h-px bg-line lg:block"
                      />
                    )}

                  </>
                )}

                <ul className="space-y-1">

                  {group.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <li key={item.path}>

                        {/* Tapping a link on a phone means the drawer has done
                            its job - it closes with the navigation. */}
                        <NavLink
                          to={item.path}
                          onClick={onMobileClose}
                          title={isCollapsed ? item.label : undefined}
                          className={({ isActive }) =>
                            `group/nav ${ROW} text-sm transition-[gap,padding,background-color,color] duration-200
                              ${isCollapsed ? ROW_COLLAPSED : ""}
                              ${
                                /*
                                | `brand` is indigo #4f46e5 in the light theme
                                | and #6366f1 in the dark one, and the dark
                                | value on a dark surface is about 3.9:1 -
                                | under AA for a 14px label. The dark theme
                                | takes `brand-hover` instead, which is the
                                | lighter end of the same indigo and clears it.
                                */
                                isActive
                                  ? "bg-brand/10 font-semibold text-brand dark:text-brand-hover"
                                  : "font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
                              }`
                          }
                        >

                          {/*
                          | The render prop rather than a plain child, so the
                          | icon can answer the active state too. A tinted row
                          | with a grey icon still in it looks like a row that
                          | is half selected.
                          */}
                          {({ isActive }) => (
                            <>

                              <Icon
                                size={18}
                                strokeWidth={isActive ? 2.25 : 1.75}
                                className={`shrink-0 transition-colors ${
                                  isActive
                                    ? "text-brand dark:text-brand-hover"
                                    : "text-ink-subtle group-hover/nav:text-ink"
                                }`}
                              />

                              <span
                                className={`truncate whitespace-nowrap ${
                                  isCollapsed ? "lg:hidden" : ""
                                }`}
                              >
                                {item.label}
                              </span>

                            </>
                          )}

                        </NavLink>

                      </li>
                    );
                  })}

                </ul>

              </div>

            ))}

          </div>

        )}

      </nav>

      {/*
        Collapsing is a desktop affordance - the drawer is either open or gone,
        so there is no half state to offer on a phone.

        No rule above it. The control is a quiet one and a full width line only
        to carry a single small button made the rail look like it ended twice;
        whitespace separates it from the menu on its own. It picks up the same
        padding the nav uses, so the chevron lines up with the edge of the
        links above it.

        The chevron carries the meaning without a label - which way it points
        is the whole message. The words stay on the tooltip and on
        `aria-label`, so a hover and a screen reader still get them.
      */}
      <div
        className={`hidden shrink-0 px-3 pb-4 lg:flex lg:justify-end ${
          isCollapsed ? "lg:justify-center" : ""
        }`}
      >

        <button
          type="button"
          onClick={onToggle}
          /*
          | `focus-visible` rather than `focus`, so the ring answers the
          | keyboard and does not sit there after a mouse click.
          */
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-ink-subtle transition-all duration-200 hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-95"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;
