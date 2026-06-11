Two bugs, both root-cause the same empty-robots seed:

1. LOGOUT ALWAYS VISIBLE
   The logout button (and the user menu / sidebar) must render regardless of how many
   robots the user has. Right now it disappears when accessibleRobots is empty, trapping
   the user. Move logout out of any robots-dependent conditional — it must always be
   reachable.

2. ROBOTS SEED IS EMPTY FOR THIS USER
   After login, every demo user lands on "0 robot accessible" / undefined robotId. The
   seed has no robots, or the robot objects have no valid id field, or the user↔robot
   assignments are broken. Fix the seed so:
   - At least one robot exists with a real non-null string id (e.g. "robot-1").
   - ops@enova.local (superadmin) sees all robots.
   - admin@enova.local (admin) is assigned robot-1.
   - client@enova.local (client) is assigned robot-1 (the primary GPS robot — the one
     whose gps_seed.json tracks will render; other robots return empty GPS).
   - The post-login redirect reads the correct id field from the user's assignment and
     lands on /robots/robot-1/dashboard, never /robots/undefined/dashboard.

Verify: logging in as each of the three demo users shows at least one robot card and
navigates to a valid dashboard URL with a real id.