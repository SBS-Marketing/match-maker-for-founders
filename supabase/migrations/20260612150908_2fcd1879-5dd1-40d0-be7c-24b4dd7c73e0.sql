
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access channels with their own user id" ON realtime.messages;
CREATE POLICY "Users can only access channels with their own user id"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND realtime.topic() LIKE '%' || auth.uid()::text || '%'
);
