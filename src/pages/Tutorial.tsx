import { Layout } from '@/components/layout/Layout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpenText, ExternalLink, PlayCircle } from 'lucide-react';

const quickSteps = [
  // 'Login karein aur Dashboard par daily summary dekhein.',
  'Do Login and see the daily summary on Dashboard.',
  // 'Predictions tab me date/range select karke absenteeism forecast check karein.',
  'Check the absenteeism forecast by selecting date/range in Predictions tab.',
  // 'Calendar me holiday aur festival patterns verify karein.',
  'Verify holiday and festival patterns in the Calendar.',
  // 'Notifications me high-risk days ke alerts track karein.',
  'Track alerts for high-risk days in Notifications.',
  // 'Admin (sirf admin users) se CSV data update/download karein.',
  'Update/Download the CSV data from the Admin (only for admin users)'
];

const screenshots = [
  {
    title: 'Attendance Trend Overview',
    description: 'A dashboard-style chart that helps you qquickly understand attendance behavior.',
    
    src: '/attendance_chart.png',
  },
  {
    title: 'Pattern Snapshot 1',
    description: 'An additional screenshot of Historical trend for quick comparison.',
    src: '/attendance_chart (1).png',
  },
  {
    title: 'Pattern Snapshot 2',
    description: 'Alternative chart view for reporting or presentation use-cases.',
    src: '/attendance_chart (2).png',
  },
];

const Tutorial = () => {
  return (
    <Layout>
      <Header
        title="Portal Tutorial"
        subtitle="How to use this portal step by step"
      />

      <div className="p-4 md:p-8 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="section-title flex items-center gap-2">
              <BookOpenText className="h-5 w-5 text-primary" /> Quick Start Guide
            </CardTitle>
            <CardDescription>
              A short walkthrough for new users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 list-decimal pl-5 text-sm md:text-base">
              {quickSteps.map((step, index) => (
                <li key={step} className="leading-relaxed">
                  <span className="font-medium text-foreground">Step {index + 1}:</span> {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="section-title">Tutorial Video</CardTitle>
            <CardDescription>
              Play the video walkthrough to see the end-to-end usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border bg-muted/40" style={{ paddingTop: '56.25%' }}>
              <iframe
                className="absolute left-0 top-0 h-full w-full"
                src="https://www.youtube.com/embed/ysz5S6PUM-U"
                title="Attendance Portal Tutorial Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="text-xs">Tip:</Badge>
              <Button asChild variant="outline" size="sm">
                <a href="https://www.youtube.com/watch?v=ysz5S6PUM-U" target="_blank" rel="noreferrer">
                  <PlayCircle className="mr-2 h-4 w-4" /> Open Video in New Tab
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="section-title">Screenshots Walkthrough</CardTitle>
            <CardDescription>
              Important screens's visual reference for training and onboarding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {screenshots.map((item) => (
                <article key={item.src} className="rounded-xl border bg-card overflow-hidden">
                  <img src={item.src} alt={item.title} className="w-full h-48 object-cover" loading="lazy" />
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-sm md:text-base">{item.title}</h3>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5">
              <Button asChild variant="secondary">
                <a href="/attendance_chart.png" target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Open Full Screenshot
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Tutorial;
