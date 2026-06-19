
CREATE POLICY "vm_upload_own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'visionmate-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vm_select_own" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'visionmate-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vm_delete_own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'visionmate-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vm_update_own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'visionmate-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
