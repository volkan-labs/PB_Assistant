import json
from django import template

register = template.Library()

@register.filter
def tojson(value):
    try:
        return json.dumps(value)
    except Exception:
        return 'null'