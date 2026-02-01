from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('PB_Assistant', '0004_searchfolder_color'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='UserSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('theme', models.CharField(default='system', max_length=20)),
                ('default_llm_model', models.CharField(blank=True, default='', max_length=255)),
                ('ui_collapse_navigation', models.BooleanField(default=False)),
                ('ui_collapse_insights', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('planetary_boundaries', models.ManyToManyField(blank=True, to='PB_Assistant.planetaryboundary')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='settings', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
