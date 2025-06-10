
import { useCreateProject } from './projects/useCreateProject';
import { useUpdateProject } from './projects/useUpdateProject';
import { useDeleteProject } from './projects/useDeleteProject';
import { useFileUpload } from './projects/useFileUpload';

export const useProjectOperations = () => {
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const { uploadBRDFile } = useFileUpload();

  return {
    createProjectMutation,
    updateProjectMutation,
    deleteProjectMutation,
    uploadBRDFile
  };
};
