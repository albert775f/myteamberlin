import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Calendar, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { InsertUploadSchedule, ProjectWithMembers, DescriptionTemplate } from "@shared/schema";

const scheduleFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  projectId: z.number().min(1, "Project is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  scheduledTime: z.string().min(1, "Time is required"),
  description: z.string().optional(),
  templateId: z.number().optional(),
  thumbnailUrl: z.string().optional(),
  status: z.enum(["scheduled", "published", "draft"]).default("scheduled"),
});

type ScheduleFormData = z.infer<typeof scheduleFormSchema>;

interface CreateScheduleDialogProps {
  trigger?: React.ReactNode;
}

export default function CreateScheduleDialog({ trigger }: CreateScheduleDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects } = useQuery<ProjectWithMembers[]>({
    queryKey: ["/api/projects"],
  });

  const { data: templates } = useQuery<DescriptionTemplate[]>({
    queryKey: ["/api/description-templates"],
    enabled: !!selectedProject,
  });

  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      title: "",
      projectId: 0,
      scheduledDate: "",
      scheduledTime: "",
      description: "",
      status: "scheduled",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      const scheduledDateTime = new Date(`${data.scheduledDate}T${data.scheduledTime}`);
      const scheduleData: Partial<InsertUploadSchedule> = {
        title: data.title,
        projectId: data.projectId,
        scheduledDate: scheduledDateTime,
        description: data.description,
        status: data.status,
      };
      
      return await apiRequest("POST", "/api/upload-schedule", scheduleData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Upload scheduled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/upload-schedule"] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule upload",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ScheduleFormData) => {
    mutation.mutate(data);
  };

  const handleProjectChange = (projectId: string) => {
    const id = parseInt(projectId);
    setSelectedProject(id);
    form.setValue("projectId", id);
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates?.find(t => t.id === parseInt(templateId));
    if (template) {
      form.setValue("description", template.content);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Schedule New Upload
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter video title"
              {...form.register("title")}
              className="w-full"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select onValueChange={handleProjectChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.projectId && (
              <p className="text-sm text-destructive">{form.formState.errors.projectId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                id="scheduledDate"
                type="date"
                {...form.register("scheduledDate")}
                className="w-full"
              />
              {form.formState.errors.scheduledDate && (
                <p className="text-sm text-destructive">{form.formState.errors.scheduledDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledTime" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time
              </Label>
              <Input
                id="scheduledTime"
                type="time"
                {...form.register("scheduledTime")}
                className="w-full"
              />
              {form.formState.errors.scheduledTime && (
                <p className="text-sm text-destructive">{form.formState.errors.scheduledTime.message}</p>
              )}
            </div>
          </div>

          {selectedProject && templates && templates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="template">Description Template</Label>
              <Select onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Enter video description"
              {...form.register("description")}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
            <Input
              id="thumbnailUrl"
              placeholder="Enter thumbnail URL (optional)"
              {...form.register("thumbnailUrl")}
              className="w-full"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Scheduling..." : "Schedule Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}