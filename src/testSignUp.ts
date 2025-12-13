const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://<your-project-ref>.supabase.co';
const supabaseKey = '<your-anon-or-service-role-key>';
const supabase = createClient(supabaseUrl, supabaseKey);

async function signUpUser() {
  const { data, error } = await supabase.auth.signUp({
    email: 'testuser@example.com',
    password: 'TestPassword123',
  });

  if (error) {
    console.error('Error signing up:', error);
  } else {
    console.log('User signed up successfully:', data);
  }
}

signUpUser();