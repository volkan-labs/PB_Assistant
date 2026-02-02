from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('PB_Assistant', '0007_seed_notification_categories'),
    ]

    operations = [
        migrations.AddField(
            model_name='usersettings',
            name='avatar_color',
            field=models.CharField(default='#FF7F11', max_length=16),
        ),
    ]
