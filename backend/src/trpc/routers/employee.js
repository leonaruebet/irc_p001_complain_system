/**
 * Employee tRPC Router
 * Handles employee registration and management
 */

const { z } = require('zod');
const { router, loggedProcedure, hrProcedure } = require('../index');

const employeeRouter = router({
  // Create or update employee from LINE profile
  createOrUpdate: loggedProcedure
    .input(z.object({
      lineUserId: z.string().min(1, 'LINE User ID is required'),
      displayName: z.string().min(1, 'Display name is required'),
      department: z.string().optional()
    }))
    .mutation(async ({ input, ctx }) => {
      console.log(`👤 Creating/updating employee: ${input.lineUserId}`);
      
      try {
        const employee = await ctx.models.Employee.createOrUpdate(
          input.lineUserId,
          {
            display_name: input.displayName,
            department: input.department
          }
        );
        
        ctx.utils.logActivity('employee_updated', {
          employeeId: employee._id,
          displayName: employee.display_name,
          department: employee.department
        });
        
        return {
          success: true,
          employee: employee.toObject(),
          message: 'Employee profile updated successfully'
        };
        
      } catch (error) {
        console.error('❌ Error creating/updating employee:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to update employee profile'
        };
      }
    }),

  // Get employee by LINE User ID
  getById: loggedProcedure
    .input(z.object({
      lineUserId: z.string().min(1)
    }))
    .query(async ({ input, ctx }) => {
      console.log(`🔍 Getting employee: ${input.lineUserId}`);
      
      try {
        const employee = await ctx.models.Employee.findById(input.lineUserId);
        
        if (!employee) {
          return {
            success: false,
            error: 'Employee not found',
            message: 'No employee found with the specified LINE User ID'
          };
        }
        
        return {
          success: true,
          employee: employee.toObject(),
          message: 'Employee retrieved successfully'
        };
        
      } catch (error) {
        console.error('❌ Error getting employee:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve employee'
        };
      }
    }),

  // List employees by department (HR only)
  listByDepartment: hrProcedure
    .input(z.object({
      department: z.string().min(1),
      activeOnly: z.boolean().default(true)
    }))
    .query(async ({ input, ctx }) => {
      console.log(`👥 Listing employees in department: ${input.department}`);
      
      try {
        const filter = { department: input.department };
        if (input.activeOnly) filter.active = true;
        
        const employees = await ctx.models.Employee
          .find(filter)
          .select('_id display_name department active created_at')
          .sort({ display_name: 1 })
          .lean();
        
        ctx.utils.logActivity('employees_listed', {
          department: input.department,
          count: employees.length,
          activeOnly: input.activeOnly
        });
        
        return {
          success: true,
          employees,
          count: employees.length,
          message: 'Employees retrieved successfully'
        };
        
      } catch (error) {
        console.error('❌ Error listing employees:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve employees'
        };
      }
    }),

  // Get all departments (HR only)
  getDepartments: hrProcedure
    .query(async ({ ctx }) => {
      console.log('🏢 Getting all departments');
      
      try {
        const departments = await ctx.models.Employee.aggregate([
          { $match: { active: true, department: { $exists: true, $ne: null } } },
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]);
        
        const departmentList = departments.map(d => ({
          name: d._id,
          employeeCount: d.count
        }));
        
        ctx.utils.logActivity('departments_retrieved', {
          count: departmentList.length
        });
        
        return {
          success: true,
          departments: departmentList,
          message: 'Departments retrieved successfully'
        };
        
      } catch (error) {
        console.error('❌ Error getting departments:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve departments'
        };
      }
    }),

  // Update employee department (HR only)
  updateDepartment: hrProcedure
    .input(z.object({
      lineUserId: z.string().min(1),
      department: z.string().min(1)
    }))
    .mutation(async ({ input, ctx }) => {
      console.log(`🏢 Updating department for employee: ${input.lineUserId}`);
      
      try {
        const employee = await ctx.models.Employee.findById(input.lineUserId);
        
        if (!employee) {
          return {
            success: false,
            error: 'Employee not found',
            message: 'No employee found with the specified LINE User ID'
          };
        }
        
        const oldDepartment = employee.department;
        await employee.updateProfile({ department: input.department });
        
        ctx.utils.logActivity('employee_department_updated', {
          employeeId: employee._id,
          oldDepartment,
          newDepartment: input.department
        });
        
        return {
          success: true,
          employee: employee.toObject(),
          message: 'Employee department updated successfully'
        };
        
      } catch (error) {
        console.error('❌ Error updating employee department:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to update employee department'
        };
      }
    }),

  // Deactivate employee (HR only)
  deactivate: hrProcedure
    .input(z.object({
      lineUserId: z.string().min(1)
    }))
    .mutation(async ({ input, ctx }) => {
      console.log(`🔒 Deactivating employee: ${input.lineUserId}`);
      
      try {
        const employee = await ctx.models.Employee.findById(input.lineUserId);
        
        if (!employee) {
          return {
            success: false,
            error: 'Employee not found',
            message: 'No employee found with the specified LINE User ID'
          };
        }
        
        if (!employee.active) {
          return {
            success: false,
            error: 'Employee already inactive',
            message: 'Employee is already deactivated'
          };
        }
        
        await employee.deactivate();
        
        ctx.utils.logActivity('employee_deactivated', {
          employeeId: employee._id,
          displayName: employee.display_name
        });
        
        return {
          success: true,
          employee: employee.toObject(),
          message: 'Employee deactivated successfully'
        };
        
      } catch (error) {
        console.error('❌ Error deactivating employee:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to deactivate employee'
        };
      }
    }),

  // Get employee statistics (HR only)
  getStats: hrProcedure
    .query(async ({ ctx }) => {
      console.log('📊 Getting employee statistics');
      
      try {
        const totalEmployees = await ctx.models.Employee.countDocuments({});
        const activeEmployees = await ctx.models.Employee.countDocuments({ active: true });
        const inactiveEmployees = totalEmployees - activeEmployees;
        
        const departmentStats = await ctx.models.Employee.aggregate([
          { $match: { active: true } },
          { $group: { _id: '$department', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
        
        ctx.utils.logActivity('employee_stats_retrieved', {
          totalEmployees,
          activeEmployees
        });
        
        return {
          success: true,
          stats: {
            totalEmployees,
            activeEmployees,
            inactiveEmployees,
            departmentBreakdown: departmentStats
          },
          message: 'Employee statistics retrieved successfully'
        };
        
      } catch (error) {
        console.error('❌ Error getting employee statistics:', error);
        
        return {
          success: false,
          error: error.message,
          message: 'Failed to retrieve employee statistics'
        };
      }
    })
});

module.exports = employeeRouter;