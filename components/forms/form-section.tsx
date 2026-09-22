import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FormSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-5">{children}</CardContent>
    </Card>
  );
}
