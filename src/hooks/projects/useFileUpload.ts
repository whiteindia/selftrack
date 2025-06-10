
import { supabase } from '@/integrations/supabase/client';

export const useFileUpload = () => {
  const uploadBRDFile = async (file: File, projectId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `brd-${projectId}-${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('project-files')
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  return { uploadBRDFile };
};
