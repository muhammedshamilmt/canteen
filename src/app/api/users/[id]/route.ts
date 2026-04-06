import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const client = await clientPromise;
    const db = client.db();
    const updateData = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const session = await client.startSession();
    try {
      await session.withTransaction(async () => {
        const currentUser = await db.collection('users').findOne({ _id: new ObjectId(id) });

        if (!currentUser) throw new Error('User not found');
        if (currentUser.role === 'admin' && updateData.role !== 'admin') throw new Error('Cannot change admin role');

        const result = await db.collection('users').updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );

        if (!result.matchedCount) throw new Error('Failed to update user');

        if (updateData.admissionNumber || updateData.class || updateData.campus) {
          await db.collection('students').updateOne(
            { admissionNumber: currentUser.admissionNumber },
            {
              $set: {
                admissionNumber: updateData.admissionNumber || currentUser.admissionNumber,
                class: updateData.class || currentUser.class,
                campus: updateData.campus || currentUser.campus,
                firstName: updateData.fullName?.split(' ')[0] || currentUser.firstName,
                lastName: updateData.fullName?.split(' ')[1] || currentUser.lastName,
              },
            }
          );
        }
      });

      return NextResponse.json({ success: true, id });
    } catch (error) {
      throw error;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params;

  try {
    const client = await clientPromise;
    const db = client.db();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!ObjectId.isValid(userId)) {
      return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 });
    }

    // Find user first (outside transaction to give a clear 404)
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 });
    }

    // Delete user
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });

    if (!result.deletedCount) {
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    // Reset student record attendance
    if (user.admissionNumber) {
      await db.collection('students').updateOne(
        { admissionNumber: user.admissionNumber },
        {
          $set: {
            attendance: {
              coffee:    { present: true },
              breakfast: { present: true },
              lunch:     { present: true },
              tea:       { present: true },
              dinner:    { present: true },
            },
            isPresent: true,
          },
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    );
  }
}
