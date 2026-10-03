/* =============================================================
   PLANTORA - admin.js
   -------------------------------------------------------------
   NOT IMPLEMENTED - this file is an intentional placeholder.

   The admin portal (edit stock, price and listed/hidden per plant)
   has not been built yet. Everything it needs is already in place:

     PlantoraStore.isAdmin()          is this user an admin?
     PlantoraStore.getInventory()     read stock + price
     PlantoraStore.setInventoryItem() write stock + price + active
     PlantoraStore.seedDemoInventory() write the 20 demo rows once

   firestore.rules already enforces admin-only writes to the
   inventory collection, and an admin is granted by creating a
   document admins/{uid} in the Firebase console.

   admin.html is the matching (empty) page shell.
   ============================================================= */