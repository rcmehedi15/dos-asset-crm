import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TaskManager } from "@/components/dashboard/TaskManager";
import { useAuth } from "@/hooks/useAuth";

const Tasks = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage your to-do list and tasks
          </p>
        </div>

        {user?.id && (
          <div className="max-w-3xl">
            <TaskManager userId={user.id} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Tasks;
