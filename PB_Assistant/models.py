from django.db import models
from pgvector.django import VectorField
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
from django.utils.text import slugify
import uuid
import logging

logger = logging.getLogger(__name__)


class PlanetaryBoundary(models.Model):
    name = models.CharField(max_length=255)
    short_name = models.CharField(max_length=255)
    def __str__(self):
        return self.name

from django.contrib.auth.models import User

class UserSettings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='settings')
    theme = models.CharField(max_length=20, default='system')
    default_llm_model = models.CharField(max_length=255, blank=True, default='')
    ui_collapse_navigation = models.BooleanField(default=False)
    ui_collapse_insights = models.BooleanField(default=False)
    planetary_boundaries = models.ManyToManyField(PlanetaryBoundary, blank=True)
    avatar_color = models.CharField(max_length=16, default='#FF7F11')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"UserSettings(user_id={self.user_id})"

class SearchFolder(models.Model):
    name = models.CharField(max_length=255)
    user_id = models.IntegerField()
    timestamp = models.DateTimeField(default=timezone.now)
    color = models.CharField(max_length=20, default='#6c757d', blank=True)

    def __str__(self):
        return self.name


class SearchHistory(models.Model):
    user_id = models.IntegerField()
    folder = models.ForeignKey(SearchFolder, related_name='searches', on_delete=models.SET_NULL, null=True, blank=True)
    query = models.TextField()
    answer = models.TextField(blank=True, null=True)

    # Serialized documents stored as JSONB
    source_documents = models.JSONField(blank=True, null=True)

    # Array of chunk IDs
    chunk_ids = ArrayField(models.CharField(max_length=255), blank=True, null=True)

    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"SearchHistory(id={self.id}, user_id={self.user_id}, query='{self.query[:30]}...', answer_length={len(self.answer) if self.answer else 0})"

class AcademicPaper(models.Model):
    paper_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    doi = models.CharField(max_length=255, null=True, blank=True)
    time_edited = models.DateTimeField(null=True, blank=True)
    text = models.TextField(null=True, blank=True)
    title = models.CharField(max_length=512, null=True, blank=True)
    title_slug = models.SlugField(max_length=512, null=True, blank=True)

    publication_year = models.IntegerField(null=True, blank=True)
    source = models.CharField(max_length=255, null=True, blank=True)
    keywords = models.JSONField(null=True, blank=True)
    author_list = models.JSONField(default=list, blank=True)
    meta = models.JSONField(null=True, blank=True)
    planetary_boundary = models.ManyToManyField(PlanetaryBoundary, through='AcademicPaperPlanetaryBoundary')

    def save(self, *args, **kwargs):
        if self.title and not self.title_slug:
            self.title_slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title or str(self.paper_id)

class AcademicPaperText(models.Model):
    academicpaper = models.OneToOneField(
        AcademicPaper,
        on_delete=models.CASCADE,
        related_name="academicpaper_text"
    )
    text= models.TextField()
    hasfulltext = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class AcademicPaperTextEmbedding(models.Model):
    academicpaper_text = models.ForeignKey(
        AcademicPaperText,
        related_name="academicpaper_embeddings",
        on_delete=models.CASCADE,
    )
    vector = VectorField(dimensions=768)
    chunk_index = models.IntegerField()
    content     = models.TextField()

    class Meta:
        unique_together = (("academicpaper_text", "chunk_index"),)

class AcademicPaperPlanetaryBoundary(models.Model):
    academicpaper = models.ForeignKey(AcademicPaper, on_delete=models.CASCADE)
    planetary_boundary = models.ForeignKey(PlanetaryBoundary, on_delete=models.CASCADE)

class NotificationCategory(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=160, unique=True)

    def __str__(self):
        return self.name


class SystemNotification(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    title = models.CharField(max_length=255)
    body = models.TextField()
    category = models.ForeignKey(NotificationCategory, on_delete=models.PROTECT, related_name='notifications')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='normal')
    published_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class NotificationUserState(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification = models.ForeignKey(SystemNotification, on_delete=models.CASCADE, related_name='user_states')
    read_at = models.DateTimeField(null=True, blank=True)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = (('user', 'notification'),)
