import { Redirect } from 'expo-router';

/** Preserve existing registration links; both modes live on the login screen. */
export default function RegisterScreen() {
  return <Redirect href={{ pathname: '/login', params: { mode: 'register' } }} />;
}
