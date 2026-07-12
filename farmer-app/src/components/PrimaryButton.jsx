import Button from './ui/Button';

// Back-compat wrapper — existing screens use <PrimaryButton title onPress disabled />.
export default function PrimaryButton({ title, onPress, disabled }) {
  return <Button title={title} onPress={onPress} disabled={disabled} style={{ marginVertical: 6 }} />;
}
