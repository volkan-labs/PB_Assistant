from django.db import migrations
from django.utils.text import slugify


def seed_categories(apps, schema_editor):
    NotificationCategory = apps.get_model('PB_Assistant', 'NotificationCategory')
    categories = [
        'System Updates',
        'Maintenance',
        'Feature Announcements',
        'Alerts',
        'Security',
        'Policy & Compliance',
    ]
    for name in categories:
        NotificationCategory.objects.get_or_create(
            slug=slugify(name),
            defaults={'name': name}
        )


def unseed_categories(apps, schema_editor):
    NotificationCategory = apps.get_model('PB_Assistant', 'NotificationCategory')
    slugs = [
        'system-updates',
        'maintenance',
        'feature-announcements',
        'alerts',
        'security',
        'policy-compliance',
    ]
    NotificationCategory.objects.filter(slug__in=slugs).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('PB_Assistant', '0006_system_notifications'),
    ]

    operations = [
        migrations.RunPython(seed_categories, unseed_categories),
    ]
