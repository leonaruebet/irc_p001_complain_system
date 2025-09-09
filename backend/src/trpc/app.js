/**
 * Main tRPC App Router
 * Combines all feature routers into a single app router
 */

const { router } = require('./index');
const complaintRouter = require('./routers/complaint');
const employeeRouter = require('./routers/employee');

const appRouter = router({
  complaint: complaintRouter,
  employee: employeeRouter
});

// Export the router type for client-side type inference
// In a TypeScript project, this would be: export type AppRouter = typeof appRouter;
module.exports = { 
  appRouter,
  // For future TypeScript client integration
  AppRouter: appRouter
};